/**
 * Internally gets a model
 */
var _ = require('lodash');
var Model = require('./Model');
var utils = require('./utils');

var modelCache = {};
var isSubscribed = {};

/**
 * Creates or gets a model from the cache
 *
 * @param io
 * @param {string} name the model name
 * @param {object?} itemDef
 * @param {object?} modelDef
 * @param {object?} filter
 * @returns {object}
 */
module.exports = function(io, name, itemDef, modelDef, filter) {
    filter = filter || {};
    name = name.toLowerCase();
    var cacheName = name + JSON.stringify(filter);

    if (_.has(modelCache, cacheName)) {
        var model = modelCache[cacheName];

        // allow modification of itemDef and modelDef after a model has been fetched
        if (itemDef) {
            model.itemDef = itemDef;
            model.refresh();
        }
        if (modelDef) model.modelDef = modelDef;

        return model.value;
    }

    var mdl = new Model(io, name, itemDef, modelDef, filter);

    if (!isSubscribed[name]) {
        utils.socketGet(io, mdl.url);
        isSubscribed[name] = true;
    }

    modelCache[cacheName] = mdl;
    return mdl.value;
};