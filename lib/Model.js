var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var publicModel = require('./publicModel');
var modelItem = require('./modelItem');

/**
 * An actual model that syncs with the server
 *
 * This object contains the internal model representation, and updates any
 * objects bound to it.
 *
 * @param {object} io the socket.io object
 * @param {string} name
 * @param itemDef {object?}
 * @param modelDef {object?}
 * @param filter {object?}
 * @constructor
 */
function Model(io, name, itemDef, modelDef, filter) {
    EventEmitter.call(this);

    //name = name.toLowerCase();

    this.io = io;
    this.name = name;
    this.url = utils.resolveName(name);
    this.itemDef = itemDef || {};
    this.modelDef = modelDef || {};
    this.filter = filter || {};
    this.children = [];
    this.eventHandlers = {};

    this.bindings = [];

    this.value = publicModel(this, new Promise(function(resolve, reject) {
        this.on('ready', resolve());
    }.bind(this)));

    this.on('created', this._onCreated.bind(this));
    this.on('updated', this._onUpdated.bind(this));
    this.on('destroyed', this._onDestroyed.bind(this));

    io.socket.on(name, function(message) {
        this.emit(message.verb, message);
    }.bind(this));

    this.refresh().then(function() {
        this.emit('ready');
    }.bind(this));
}

util.inherits(Model, EventEmitter);

module.exports = Model;

Model.prototype._addItem = function(child) {
    if (this.value.indexOf(child) !== -1) return;
    this.value._push(child);
};

Model.prototype._removeItem = function(child) {
    var index = this.value.indexOf(child);
    if (index !== -1) this.value._splice(index, 1);
};

Model.prototype._removeAll = function() {
    while (this.value.length) this.value._pop();
};

/**
 * Triggered when a new item is added to the model
 *
 * @param {Object} message
 * @private
 */
Model.prototype._onCreated = function(message) {
    var newChild = modelItem(message.data, this);
    this.childMatches(newChild).then(function(matches) {
        if (matches) this._addItem(newChild);
    }.bind(this));
};

/**
 * Triggered when an item is modified
 *
 * @param {Object} message
 * @private
 */
Model.prototype._onUpdated = function(message) {
    var itemWithId = this.value.itemById(message.id);
    if (itemWithId) itemWithId.update(message.data, false);
};

/**
 * Triggered when an item is destroyed
 *
 * @param {Object} message
 * @private
 */
Model.prototype._onDestroyed = function(message) {
    var itemWithId = this.value.itemById(message.id);
    if(itemWithId) this._removeItem(itemWithId);
};

/**
 * Finds if a child matches the filter for this model instance
 *
 * @param {Object} child
 */
Model.prototype.childMatches = function(child) {
    return Promise.resolve((function() {
        // if they are not the same model, they do not match
        if (child.model.name !== this.name) return false;

        // if they are the same model and the model doesn't have a filter, they match
        if (_.isEqual(this.filter, {})) return true;

        // otherwise compare the filter
        return child.matches(this.filter);
    }.bind(this)()));
};

/**
 * Re-fetches all items and adds them
 *
 * @returns {Model}
 */
Model.prototype.refresh = function() {
    return utils.socketGet(this.io, this.url, this.filter).then(function(data) {
        var dat = _.isArray(data) ? data : [data];
        this._removeAll();
        for (var i = 0; i < dat.length; i++) {
            this._addItem(modelItem(dat[i], this));
        }
    }.bind(this));
};

/**
 * Saves all items in the model
 *
 */
Model.prototype.save = function() {
    _.forEach(this.value, function(item) {
        item.save();
    });
};