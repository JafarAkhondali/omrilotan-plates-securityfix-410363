var randomString = (function () {
    var chars = "abcdefghijklmnopqrstuvwxyz";
    return function (count) {
        var result = [];
        count = count || 1;
        while (count--) {
            result.push(chars.charAt(Math.ceil(Math.random() * (chars.length - 1))));
        }
        return result.join("");
    };
}());


console.log(randomString(8));