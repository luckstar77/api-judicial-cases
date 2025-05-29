import {db} from '../db';

export default {
    findById(id: string) {
        
        return db('users').where('id', id).first();
    },

    create(data: any) {
        return db('users').insert(data).returning('*');
    }
};
