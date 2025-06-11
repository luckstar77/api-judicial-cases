import { Router } from 'express';
import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import checkLoggedIn  from '../middlewares/checkLoggedIn';
import * as caseCtrl from '../controllers/caseController';
import { S3Client } from '@aws-sdk/client-s3';

AWS.config.update({ region: 'ap-northeast-1' });
const s3 = new S3Client({ region: 'ap-northeast-1' });

const upload = multer({
    storage: multerS3({
        s3,
        bucket: 'images.rental.imallenlai.com',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (_req, file, cb) => {
            const key = `cases/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
            cb(null, key);
        },
    }),
});

const router = Router();

router.post('/', checkLoggedIn, upload.array('images', 10), caseCtrl.createCase);
router.get('/', caseCtrl.listCases);
router.get('/:id', caseCtrl.getCaseDetail);
router.post('/:id/comments', checkLoggedIn, caseCtrl.addComment);
router.post('/:id/like', checkLoggedIn, caseCtrl.toggleLike);

export default router;