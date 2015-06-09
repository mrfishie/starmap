/**
 * Starmap - easy database manipulation with Sails
 *
 * @preserve
 */

var Promise = require('bluebird');
var _ = require('lodash');

var gm = require('./getModel');
var utils = require('./utils');

function get(io) {
    /**
     * Creates or updates a model definition
     *
     * @param {string} name
     * @param itemDef {object?} the item definition
     * @param modelDef {object?} the model definition
     * @returns {object} the model
     */
    function getModel(name, itemDef, modelDef) {
        return gm(io, name, itemDef, modelDef);
    }
    getModel.model = getModel;

    /**
     * Creates a new instance of the model
     *
     * @param {string} name
     * @param {object?} props
     * @returns {object}
     */
    getModel.create = function(name, props) {
        return getModel(name).create(props);
    };

    /**
     * Finds all matching items.
     * The same as .model(name).find(filter)
     *
     * @param {string} name
     * @param filter
     * @returns {Promise}
     */
    getModel.find = function(name, filter) {
        return getModel(name).find(filter);
    };

    /**
     * Finds a single matching item
     * The same as .model(name).findOne(filter)
     *
     * @param {string} name
     * @param filter
     * @returns {Promise}
     */
    getModel.findOne = function(name, filter) {
        return getModel(name).findOne(filter);
    };

    /**
     *
     *
     * @param func
     * @param subProps
     * @returns {*}
     */
    getModel.calculate = utils.createCalculateProperty;

    return getModel;
}

if (window.io) module.exports = get(window.io);
else module.exports = get;

// for testing
window.starmap = module.exports;