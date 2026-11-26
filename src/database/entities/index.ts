import { Case } from './case.entity';
import { CaseComment } from './case-comment.entity';
import { CaseLike } from './case-like.entity';
import { Judgment } from './judgment.entity';
import { JudgmentComment } from './judgment-comment.entity';
import { JudgmentLike } from './judgment-like.entity';
import { User } from './user.entity';

export { Case, CaseComment, CaseLike, Judgment, JudgmentComment, JudgmentLike, User };

export const ENTITIES = [User, Judgment, JudgmentComment, JudgmentLike, Case, CaseComment, CaseLike];
