var _ = require('lodash');

/**
 * Converts the model name to a path
 *
 * TODO: this might not be neccessary
 *
 * @param {string} name
 * @returns {string}
 */
exports.resolveName = function(name) {
    var prefixIndex = name.indexOf('/'), prefix = '';
    if (prefixIndex !== -1) {
        prefix = name.substring(0, prefixIndex) + '/';
        name = name.substring(prefixIndex + 1);
    }

    return '/' + prefix + name;
};

var requestId = 0;

function promisifySocket(fName) {
    return function(io, url, additional) {
        var rid = requestId++;

        console.log(rid, fName.toUpperCase(), url, additional);

        return (new Promise(function(resolve, reject) {
            io.socket[fName](url, additional, function (response) {
                if (response.error) reject(response.error);
                else if (_.isString(response)) reject(new Error(response));
                else resolve(response);
            });
        })).then(function(res) {
            console.log(rid, "OK", res);
            return res;
        }, function(err) {
            console.log(rid, "ERR", err);
            throw err;
        });
    }
}

exports.socketGet = promisifySocket("get");
exports.socketPost = promisifySocket("post");
exports.socketPut = promisifySocket("put");
exports.socketDelete = promisifySocket("delete");

exports.defineProperties = (function() {
    if (Object.defineProperties) return Object.defineProperties;
    return function(base, obj) {
        _.extend(base, _.mapValues(obj, function(val) {
            return val.value;
        }));
    }
}());

exports.createCalculateProperty = function(func, subProps) {
    return _.merge({
        __precalc: func
    }, subProps);
};