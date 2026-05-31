export default class PublicUser{
    constructor(name, email){
        this.name = name;
        this.email = email;
    }

    static fromDbUser(user) {
    return new PublicUser(
      user.name,
      user.email
    );
  }
}