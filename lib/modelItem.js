var _ = require('lodash');
var utils = require('./utils');
var Promise = require('bluebird');

/**
 * Updates the model to represent the given data
 *
 * @param {object} item
 * @param {Model} model
 * @param {object} data the data to add to the model
 * @param {object?} funcParams parameters to pass to any precalc functions
 * @returns {Promise}
 */
function update(item, model, data, funcParams) {
    var working = [];
    var definedByData = [];

    _.forEach(data, function(value, key) {
        if (_.isFunction(value)) {
            working.push(Promise.resolve(value()).then(function(val) {
                item[key] = val;
            }));
        } else item[key] = value;
        definedByData.push(value);
    });

    _.forEach(model.itemDef, function(value, key) {
        if (value && value.__precalc) {
            console.log("VALUE IS", value, value.__precalc);
            var func = value.__precalc, previousVal = data[key];
            working.push(Promise.resolve(func.call(item, previousVal, funcParams || {})).then(function(val) {
                item[key] = (val && val._stWrapped) ? val.val : val;
            }));
        } // if the property has not been set from the itemDef yet. This allows item def properties to be changed
        else if (!_.has(item, key) || definedByData.indexOf(key) !== -1) item[key] = value;
    });

    return Promise.all(working);
}

/**
 * Gets properties to be synced with the server
 *
 * @param {object} item
 * @param {Model} model
 * @param {object?} props
 * @returns {object}
 */
function serverProperties(item, model, props) {
    var result = {};
    var toRefresh = [];

    _.forEach(props || item, function(val, key) {
        if (val._isModelItem) {
            result[key] = val.id;
            toRefresh.push(val);
        } else if (_.isArray(val)) {
            result[key] = _.map(val, function(item) {
                if (item._isModelItem) {
                    toRefresh.push(item);
                    return item.id;
                }
                return item;
            });
        } else if (_.has(model.itemDef, key)) {
            if (_.has(model.itemDef[key], '__connection')) result[key] = val;
        } else result[key] = val;
    });

    return {
        properties: result,
        refresh: toRefresh
    };
}

/**
 * Creates the item on the server
 *
 * @param {object} item
 * @param {Model} model
 * @param {object?} data
 * @returns {Promise}
 */
function create(item, model, data) {
    var serverProps = serverProperties(item, model, data).properties;
    return utils.socketPut(model.io, model.url + '/create/', serverProps).then(function(response) {
        _.merge(serverProps, response);
        return update(item, model, serverProps);
    }).then(function() {
        // Refresh all items that were referenced - some of their properties might change
        return Promise.all(_.map(serverProps.refresh, function(item) {
            return item.refresh();
        }));
    });
}

/**
 * A single model item that is synced with the server
 *
 * @param {object} data
 * @param {Model} model
 */
function modelItem(data, model) {
    var res = {};

    utils.defineProperties(res, {
        _isModelItem: { value: true },

        model: { value: model.value },

        update: { value: function(data, sync) {
            if (sync == null) sync = true;

            return update(res, model, data).then(function() {
                if (!sync) return;
                return res.save();
            });
        } },

        save: { value: function() {
            if (_.has(res, 'id')) {
                var props = serverProperties(res, model);
                return utils.socketPost(model.io, model.url + '/update/' + res.id, props.properties).then(function() {
                    return Promise.all(_.map(props.refresh, function(item) {
                        return item.refresh();
                    }));
                });
            }
            return create(res, model);
        } },

        refresh: { value: function() {
            if (!_.has(res, 'id')) return create(res, model);

            return utils.socketGet(model.io, model.url + '/' + res.id).then(function(data) {
                return update(res, model, data, { noRefresh: true });
            });
        } },

        delete: { value: function() {
            model._removeItem(res);
            return utils.socketDelete(model.io, model.url, { id: res.id });
        } },

        matches: { value: function(query) {
            return utils.socketGet(model.io, model.url, query).then(function(r) {
                for (var i = 0; i < r.length; i++) {
                    if (r[i].id === res.id) return true;
                }
                return false;
            });
        } },

        then: { value: function() {
            return res.ready.then.apply(res.ready, arguments);
        } },

        catch: { value: function() {
            return res.ready.catch.apply(res.ready, arguments);
        } }
    });

    res.ready = Promise.resolve();

    update(res, model, data || {});

    return res;
}

module.exports = modelItem;