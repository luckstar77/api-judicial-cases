import {db} from '../db';

export default async (uid:string, user:{
    name:string;
    email:string
}) => {

    const result = await db('users')
        .where({ uid })
        .update({...user});
    return result;
};
