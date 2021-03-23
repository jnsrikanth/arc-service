import AWS from 'aws-sdk'
import * as ociOS from "oci-objectstorage"
import fs, { statSync } from 'fs'
import { common } from 'oci-sdk'
import { format } from 'util'

import { CONFIG } from '../config/config'
import { InfrastructureProvider, InfrastructureProviderMap } from '../constants'
import { MLDatasource } from '../datasources/MLDatasource'
import { NodeFSBlob } from 'oci-objectstorage'
import { StatusCodes } from 'http-status-codes'
import OracleStorageHelper from '../helpers/oracle-storage-helper'
import moment from 'moment'

const infrastructureProvider = InfrastructureProviderMap[CONFIG.INFRASTRUCTURE_PROVIDER]
let oracleStorageHelper: OracleStorageHelper
if(infrastructureProvider === InfrastructureProvider.Oracle) {
  oracleStorageHelper = OracleStorageHelper.getInstance()
}


const s3 = new AWS.S3({
  signatureVersion: 'v2',
  accessKeyId: CONFIG.S3_ACCESS_KEY_ID,
  secretAccessKey: CONFIG.S3_SECRET_ACCESS_KEY
})

const ec2 = new AWS.EC2({
  region: CONFIG.EC2_REGION,
  accessKeyId: CONFIG.EC2_ACCESS_KEY_ID,
  secretAccessKey: CONFIG.EC2_SECRET_ACCESS_KEY
})

common.ConfigFileAuthenticationDetailsProvider


export const createSampleFileInStorage = async (objectKey: string) => {
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS:
      const params: AWS.S3.PutObjectRequest = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: objectKey,
        ContentType: 'application/json',
        Body: JSON.stringify({
            content: 'test' 
        })
      }
      console.log(params)
      await s3.putObject(params).promise()
      break;
    case InfrastructureProvider.Oracle:
      await oracleStorageHelper.createSampleFile(objectKey)
    default:
      break;
  }
}

export const uploadFileToStorage = async (pathToFile: string, objectKey: string) => {
  switch(infrastructureProvider) {
    case InfrastructureProvider.AWS: {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: objectKey,
        ContentType: 'application/octet-stream',
        Body: fs.createReadStream(pathToFile)
      }
      await s3.putObject(params).promise()
      break
    }
    case InfrastructureProvider.Oracle: {
      await oracleStorageHelper.uploadFile(pathToFile, objectKey)
      break
    }
  }
}

export const uploadBase64ImageToStorage = async (base64Image: string, objectKey: string) => {
  
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS: {
      const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64')
      const [,type] = base64Image.split(';')[0].split('/')
      const params = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: objectKey, // File name you want to save as in S3
        Body: imageBuffer,
        ContentEncoding: 'base64',
        ContentType: `image/${type}` 
      }
      await s3.upload(params).promise()
      break
    }
    case InfrastructureProvider.Oracle:
      await oracleStorageHelper.uploadBase64Image(base64Image, objectKey)
      break;
    default:
      break;
  }
}

export const copyObjectInStorage = async (source: string, destination: string) => {
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS: {
      const params = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`, 
        CopySource: `${CONFIG.S3_BUCKET_NAME}/${source}`, 
        Key: destination
      };
      await s3.copyObject(params).promise()
      break
    }
    case InfrastructureProvider.Oracle:
      await oracleStorageHelper.copyObject(source, destination)
      break
  }
}

export const deleteObjectKeysInStorage = async (objectKeys: string[]) => {
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS:
      const params = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Delete: {
          Objects: objectKeys.map(key => ({
              Key: key
          })),
          Quiet: false
        }
      }
      await s3.deleteObjects(params).promise()
      break
    case InfrastructureProvider.Oracle:
      oracleStorageHelper.deleteObjectKeys(objectKeys)
      break
  }
}

export const getSignedGetUrl = async (key: string) => {
  const expiryDate = moment().add(1, 'day').toDate()
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS:
      const url = s3.getSignedUrl('getObject', {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: key,
        Expires: 1 * 24 * 60 * 60
      })
      return {
        url,
        expiryDate
      }
    case InfrastructureProvider.Oracle:
      return {
        url: await oracleStorageHelper.getSignedGetUrl(key, expiryDate),
        expiryDate
      }
      break
  }
}

export const isObjectKeyExistsInStorage = async (key: string) => {
  try {
    switch (infrastructureProvider) {
      case InfrastructureProvider.AWS:
        const params: AWS.S3.HeadObjectRequest = {
          Bucket: `${CONFIG.S3_BUCKET_NAME}`,
          Key: key
        }
        await s3.headObject(params).promise()
        return true
      case InfrastructureProvider.Oracle:
        return await oracleStorageHelper.isObjectKeyExists(key)
      default:
        break;
    }
  } catch (ex) {
    console.error(ex)
    return false
  }
}

export const deleteObjectPrefixInStorage = async (prefix: string) => {
  switch (infrastructureProvider) {
    case InfrastructureProvider.AWS:
      await deleteS3ObjecPrefix(prefix)
      break;
    case InfrastructureProvider.Oracle:
      oracleStorageHelper.deleteObjectPrefix(prefix)
      break
    default:
      break;
  }
}


export const deleteS3ObjecPrefix = async (prefix: string) => {
    let lastMarker
    console.log('Requested to delete S3 prefix: %s, %s', prefix, new Date())
    while (true) {
        const params: AWS.S3.ListObjectsRequest = {
            Bucket: `${CONFIG.S3_BUCKET_NAME}`,
            Prefix: prefix,
            ...(lastMarker ? {
                lastMarker
            } : null)
        }
        const listData = await s3.listObjects(params).promise()
        const objectsToDelete = listData.Contents ? listData.Contents.map((object) => ({ Key: object.Key || '' })) : []
        if(objectsToDelete.length) {
            lastMarker = objectsToDelete[objectsToDelete.length - 1].Key
            const deleteObjectsParams: AWS.S3.DeleteObjectsRequest = {
                Bucket: `${CONFIG.S3_BUCKET_NAME}`,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: false
                }
            }
            await s3.deleteObjects(deleteObjectsParams).promise()
        }
        if(!listData.IsTruncated) {
            break
        }
    }
    console.log('Request completed to delete S3 prefix: %s, %s', prefix, new Date())
}

export const getUserImagesFolder = (organizationId: number, userId: number) => `${getOrganizationPath(organizationId)}/users/${userId}/images`
export const getUserImageIndexKey = (organizationId: number, userId: number, index: number, extension: string = 'jpg') => `${getUserImagesFolder(organizationId, userId)}/user-${userId}-${index}.${extension}`
export const getOrganizationPath = (organizationId: number) => `${CONFIG.S3_BUCKET_PREFIX ? `${CONFIG.S3_BUCKET_PREFIX}/`: ''}organizations/${organizationId}`
export const getOrganizationMeetingsPath = (organizationId: number) => `${getOrganizationPath(organizationId)}/meetings`

/*
BucketName: arc-dashboard

PickeFile Structure: users/13/13.pickle
User Video(raw): users/13/videos/raw/ab12cd34ef56.webm
User Video(processed): users/13/videos/processed/ab12cd34ef56.mp4
*/
export const getMeetingVideoKeys = (organizationId: number, meetingId: number) => {
    return {
        rawVideo: `${getOrganizationMeetingsPath(organizationId)}/${meetingId}.webm`,
        processedVideo: `${getOrganizationMeetingsPath(organizationId)}/${meetingId}-processed.mp4`,
    }
}

export const getEncodingsPath = (organizationId: number) => `${getOrganizationPath(organizationId)}/pickles`
export const getUserPickleKey = (organizationId: number, userId: number) => `${getEncodingsPath(organizationId)}/${userId}.pickle`


export const getInstanceState = async (instanceId: string) => {
  const params: AWS.EC2.DescribeInstanceStatusRequest = {
      IncludeAllInstances: true,
      InstanceIds: [
          instanceId
      ]
  }
  const result = await ec2.describeInstanceStatus(params).promise()
  if(result.InstanceStatuses?.length) {
      const [instanceStatus]: AWS.EC2.InstanceStatus[] = result.InstanceStatuses
      return instanceStatus.InstanceState ? `${instanceStatus.InstanceState.Name}` : 'unknown'
  }
  return 'unknown'
}

const waitFor = (seconds: number) => new Promise((resolve, reject) => {
  setTimeout(() => {
      resolve(true)
  }, seconds * 1000);
})

export const startInstance = async (instanceId: string, retries = 10) => {
  for(let i=0; i<retries; i++) {
      const instanceState = await getInstanceState(instanceId)
      if(['running'].includes(instanceState)) {
          return true
      }
      if(['stopping', 'pending'].includes(instanceState)) {
          await waitFor(30) // wait for 30 sconds
      }
      if(['stopped'].includes(instanceState)) {
          await MLDatasource.getInstance().execCommandAsync(`${CONFIG.SHELL_SCRIPT_PATH}/start_gpu.sh`, [], () => {}, () => {})
      }
  }
  throw new Error(format('Unable to start the GPU instance: %s', instanceId));
}

export const startGPUInstance = async () => {
  return true
  // await startInstance(CONFIG.GPU_INSTANCE_ID)
}

