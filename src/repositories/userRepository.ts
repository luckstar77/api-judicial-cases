import knex from '../db/knex';

export default {
    findById(id: string) {
        return knex('users').where('id', id).first();
    },

    create(data: any) {
        return knex('users').insert(data).returning('*');
    }
};
