import fs from "fs"
import { common } from "oci-sdk";
import * as ociOS from "oci-objectstorage"
import { CONFIG } from "../config/config";
import { statSync } from "fs";
import { StatusCodes } from "http-status-codes";
import { CreatePreauthenticatedRequestDetails } from "oci-objectstorage/lib/model";
import moment from "moment";

export default class OracleStorageHelper {
  private static oracleStorageHelper: OracleStorageHelper
  private objectStorageClient: ociOS.ObjectStorageClient
  private region: common.Region
  private namespaceName: string = ''
  constructor() {
    const ociRegion = common.Region.fromRegionId(CONFIG.OCI_REGION)
    const provider: common.SimpleAuthenticationDetailsProvider = new common.SimpleAuthenticationDetailsProvider(CONFIG.OCI_TENANCY, CONFIG.OCI_USER, CONFIG.OCI_FINGERPRINT, fs.readFileSync(CONFIG.OCI_KEY_FILE, 'utf-8'), null, ociRegion);

    const ociObjectStorageclient = new ociOS.ObjectStorageClient({
      authenticationDetailsProvider: provider
    });
    ociObjectStorageclient.region = ociRegion;
    this.objectStorageClient = ociObjectStorageclient
    this.region = ociRegion
    this.setNamespaceName()
  }
  private async setNamespaceName() {
    const { value: namespaceName} = await this.objectStorageClient.getNamespace({});
    this.namespaceName = namespaceName
  }
  public static getInstance() {
    if (!OracleStorageHelper.oracleStorageHelper) {
      OracleStorageHelper.oracleStorageHelper = new OracleStorageHelper()
    }
    return OracleStorageHelper.oracleStorageHelper
  }
  async uploadFile(pathToFile: string, objectKey: string) {
    const stats = statSync(pathToFile);
    const nodeFsBlob = new ociOS.NodeFSBlob(pathToFile, stats.size);
    const objectData = await nodeFsBlob.getData();
    const params: ociOS.requests.PutObjectRequest = {
      namespaceName: this.namespaceName,
      bucketName: `${CONFIG.S3_BUCKET_NAME}`,
      objectName: objectKey,
      putObjectBody: objectData,
      contentLength: stats.size
    }
    await this.objectStorageClient.putObject(params);
  }
  async uploadBase64Image(base64Image: string, objectKey: string) {
    const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64')
    const [,type] = base64Image.split(';')[0].split('/')
    const params: ociOS.requests.PutObjectRequest = {
      namespaceName: this.namespaceName,
      bucketName: `${CONFIG.S3_BUCKET_NAME}`,
      objectName: objectKey,
      putObjectBody: imageBuffer,
      contentEncoding: 'base64',
      contentLength: imageBuffer.length,
      contentType: `image/${type}`
    }
    await this.objectStorageClient.putObject(params);
  }
  async copyObject(source: string, destination: string) {
    const params: ociOS.requests.CopyObjectRequest = {
      namespaceName: this.namespaceName,
      bucketName: `${CONFIG.S3_BUCKET_NAME}`,
      copyObjectDetails: {
        sourceObjectName: source,
        destinationNamespace: this.namespaceName,
        destinationBucket: `${CONFIG.S3_BUCKET_NAME}`,
        destinationObjectName: destination,
        destinationRegion: this.region.regionId
      }
    }
    await this.objectStorageClient.copyObject(params)
  }
  async createSampleFile(objectKey: string) {
    const params: ociOS.requests.PutObjectRequest = {
      namespaceName: this.namespaceName,
      bucketName: `${CONFIG.S3_BUCKET_NAME}`,
      objectName: objectKey,
      putObjectBody: JSON.stringify({
        content: 'test' 
      })
    }
    await this.objectStorageClient.putObject(params);
  }
  async deleteObjectKeys(objectKeys: string[]) {
    for(const objectKey of objectKeys) {
      try {
        await this.objectStorageClient.deleteObject({
          namespaceName: this.namespaceName,
          bucketName: `${CONFIG.S3_BUCKET_NAME}`,
          objectName: objectKey
        })
      } catch (ex) {
        if(ex.statusCode === StatusCodes.NOT_FOUND) {
          continue
        }
        throw ex
      }
    }
  }
  async getSignedGetUrl(objectKey: string, expiryDate: Date) {
    const res = await this.objectStorageClient.createPreauthenticatedRequest({
      namespaceName: this.namespaceName,
      bucketName: `${CONFIG.S3_BUCKET_NAME}`,
      createPreauthenticatedRequestDetails: {
        name: `${moment(expiryDate).toDate().getTime()}`,
        objectName: objectKey,
        accessType: CreatePreauthenticatedRequestDetails.AccessType.ObjectRead,
        timeExpires: expiryDate
      }
    })
    return `https://objectstorage.${this.region.regionId}.oraclecloud.com${res.preauthenticatedRequest.accessUri}`
  }
  async isObjectKeyExists(objectKey: string) {
    try {
      const res  = await this.objectStorageClient.headObject({
        namespaceName: this.namespaceName,
        bucketName: `${CONFIG.S3_BUCKET_NAME}`,
        objectName: objectKey
      })
      return true
    } catch (ex) {
      console.log('objectKey', objectKey)
      console.log(ex)
      return false
    }
  }
  async deleteObjectPrefix(prefix: string) {
    let startWith
    while (true) {
      const params: ociOS.requests.ListObjectsRequest = {
        namespaceName: this.namespaceName,
        bucketName: `${CONFIG.S3_BUCKET_NAME}`,
        prefix,
        ...(startWith ? {
          start: startWith
        } : null),
      }
      const { listObjects } = await this.objectStorageClient.listObjects(params)
      if(!listObjects.objects.length) break
      await this.deleteObjectKeys(listObjects.objects.map(({ name }) => name))
      startWith = listObjects.nextStartWith
    }
  }
}