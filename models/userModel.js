export default class PublicUser {
    constructor(name, email,id) {
        this.name = name;
        this.email = email;
        this.id = id
    }

    static fromDbUser(user) {
        return new PublicUser(
            user.id,
            user.name,
            user.email,
        );
    }
}