import userRepository from '../repositories/userRepository';

export default {
    async getUserById(id: string) {
        return userRepository.findById(id);
    },

    async createUser(data: any) {
        return userRepository.create(data);
    }
};
