const resolvers = require('./src/resolvers/index');
resolvers.searchAll('test').then(res => {
    console.log(res);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
