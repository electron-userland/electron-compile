class Greeter {
    constructor(public greeting: string) { }
    greet() {
        return "<h1>" + this.greeting + "</h1>";
    }
};

// NB: This is not of type String!
var greeter = new Greeter({});
