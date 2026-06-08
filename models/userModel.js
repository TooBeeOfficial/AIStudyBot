export default class PublicUser {
    constructor(id, name, email ) {
        this.id = id
        this.name = name;
        this.email = email;
    }

    static fromDbUser(user) {
        return new PublicUser(
            user.id,
            user.name,
            user.email,
        );
    }
}