import AWS from 'aws-sdk'
import fs from 'fs'
import { format } from 'util'
import { CONFIG } from '../config/config'
import { MLDatasource } from '../datasources/MLDatasource'
const s3 = new AWS.S3({
    signatureVersion: 'v2',
    accessKeyId: CONFIG.S3_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.S3_SECRET_ACCESS_KEY
})
console.log(CONFIG)

const ec2 = new AWS.EC2({
    region: CONFIG.EC2_REGION,
    accessKeyId: CONFIG.EC2_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.EC2_SECRET_ACCESS_KEY
})

export const createSampleFileInS3 = async (s3ObjectKey:string) => {
    const params: AWS.S3.PutObjectRequest = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: s3ObjectKey,
        ContentType: 'application/json',
        Body: JSON.stringify({
            content: 'test' 
        })
    }
    console.log(params)
    await s3.putObject(params).promise()
}

export const uploadFileToS3 = async (pathToFile: string, s3ObjectKey: string, folderOnly = false) => {
    const params: AWS.S3.PutObjectRequest = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: s3ObjectKey,
        ...(!folderOnly && {
            ContentType: 'application/octet-stream',
            Body: fs.createReadStream(pathToFile)
        })
    }
    await s3.putObject(params).promise()
}

export const uploadBase64ImageToS3 = async (base64Image: string, s3ObjectKey: string) => {
    const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64')
    const [,type] = base64Image.split(';')[0].split('/')
    const params = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: s3ObjectKey, // File name you want to save as in S3
        Body: imageBuffer,
        ContentEncoding: 'base64',
        ContentType: `image/${type}` 
    }
    await s3.upload(params).promise()
}

export const copyS3Object = async (source: string, destination: string) => {
    const params = {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`, 
        CopySource: `${CONFIG.S3_BUCKET_NAME}/${source}`, 
        Key: destination
    };
    await s3.copyObject(params).promise()
}

export const deleteS3Keys = async (objectKeys: string[]) => {
    console.log(objectKeys.map(key => ({
        Key: key
    })))
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
}

export const getSignedGetUrl = (key: string) => {
    const url = s3.getSignedUrl('getObject', {
        Bucket: `${CONFIG.S3_BUCKET_NAME}`,
        Key: key,
        Expires: 1 * 24 * 60 * 60
    })
    return url
}

export const checkUserPickleFileExits = async (organizationId: number, userId: number) => {
    return await isS3ObjectExists(getUserPickleKey(organizationId, userId))
}

export const isS3ObjectExists = async (key: string) => {
    try {
        const params: AWS.S3.HeadObjectRequest = {
            Bucket: `${CONFIG.S3_BUCKET_NAME}`,
            Key: key
        }
        await s3.headObject(params).promise()
        return true
    } catch (ex) {
        return false
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

/*
BucketName: arc-dashboard

PickeFile Structure: users/13/13.pickle
User Video(raw): users/13/videos/raw/ab12cd34ef56.webm
User Video(processed): users/13/videos/processed/ab12cd34ef56.mp4
*/
export const getUserImagesFolder = (organizationId: number, userId: number) => `${getOrganizationPath(organizationId)}/users/${userId}/images`
export const getUserImageIndexKey = (organizationId: number, userId: number, index: number, extension: string = 'jpg') => `${getUserImagesFolder(organizationId, userId)}/user-${userId}-${index}.${extension}`
export const getOrganizationPath = (organizationId: number) => `${CONFIG.S3_BUCKET_PREFIX ? `${CONFIG.S3_BUCKET_PREFIX}/`: ''}organizations/${organizationId}`
export const getOrganizationMeetingsPath = (organizationId: number) => `${getOrganizationPath(organizationId)}/meetings`
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
        resolve()
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
    await startInstance(CONFIG.GPU_INSTANCE_ID)
}