import * as knex from '../db/knex';

export default async (uid:string, user:{
    name:string;
    email:string
}) => {
    const knexClient = await knex.getClient();

    const result = await knexClient('users')
        .where({ uid })
        .update({...user});
    return result;
};
