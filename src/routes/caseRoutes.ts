import { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import checkLoggedIn  from '../middlewares/checkLoggedIn';
import * as caseCtrl from '../controllers/caseController';
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.S3_BUCKET_NAME!,
        // The bucket enforces BucketOwnerEnforced; ACLs cannot be set.
        // Configure bucket policies to manage public access if needed.
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
router.get('/pages', caseCtrl.getTotalPages);
router.get('/search/:search', checkLoggedIn, caseCtrl.searchCases);
router.get('/:id', caseCtrl.getCaseDetail);
router.post('/:id/comments', checkLoggedIn, caseCtrl.addComment);
router.post('/:id/like', checkLoggedIn, caseCtrl.toggleLike);
router.get('/:id/like/status', checkLoggedIn, caseCtrl.getLikeStatus);

export default router;
