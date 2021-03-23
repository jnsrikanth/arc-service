import { CONFIG } from '../config/config'
import { InfrastructureProvider } from '../constants'
import { MLDatasource } from '../datasources/MLDatasource'
import { createSampleFileInStorage, getEncodingsPath, getUserImageIndexKey } from '../helpers/storage-helper'
import { uploadBase64ImageToStorage } from '../helpers/storage-helper'

export const postUserImages = async (req: any, res: any, next: Function) => {
    try {
        const { id: userId, name: userName, organization: { id: organizationId } } = req.context.authorization
        const images: string[] = req.body.images
        await Promise.all(images.map((image, index) => uploadBase64ImageToStorage(image, getUserImageIndexKey(organizationId, userId, index+1))))
        await createSampleFileInStorage(`${getEncodingsPath(organizationId)}/test.json`)
        res.status(200).json({
            status: {
                code: 0,
                error: ''
            }
        })
    } catch (ex) {
        next(ex)
    }
    
}