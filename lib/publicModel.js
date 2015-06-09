var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');

var getModel = require('./getModel');
var modelItem = require('./modelItem');

/**
 * Creates a public model object
 *
 * @param {Model} model
 * @param {Promise} readyPromise
 * @returns {Array} the public object
 */
function publicModel(model, readyPromise) {
    var res = [];

    function find(filter) {
        var mergedFilter = _.merge({}, model.filter, filter);
        var filteredModel = getModel(model.io, model.name, model.itemDef, model.modelDef, mergedFilter);
        if (model.children.indexOf(filteredModel) === -1) model.children.push(filteredModel);

        return filteredModel;
    }


    function getByIds(ids) {
        var items = [];
        for (var i = 0; i < res.length; i++) {
            if (ids.indexOf(res[i].id) !== -1) items.push(res[i]);
        }
        return items;
    }

    utils.defineProperties(res, {
        _isModel: { value: true },
        name: { value: model.name },

        ready: { value: readyPromise },

        create: { value: function(props) {
            props = props || {};

            var item = modelItem(props, model);
            item.ready = item.update(props).then(function() {
                model._addItem(item);
            });
            return item;
        } },

        itemById: { value: function(id) {
            for (var i = 0; i < res.length; i++) {
                if (res[i].id === id) return res[i];
            }
            return false;
        } },

        find: { value: find },
        filter: { value: find },

        findOne: { value: function(filter) {
            return find(filter).then(function(val) {
                if (val.length) return val[0];
                return false;
            });
        } },

        refresh: { value: function() {
            return Promise.all(_.map(res, function(item) {
                return item.refresh();
            }));
        } },

        then: { value: function() {
            return readyPromise.then.apply(readyPromise, arguments);
        } },

        catch: { value: function() {
            return readyPromise.catch.apply(readyPromise, arguments);
        } },

        __connection: { value: model.name }
    });

    //Object.defineProperties(res, );

    _.merge(res, utils.createCalculateProperty(function(previous, flags) {
        if (!previous) return;

        var isArray = _.isArray(previous), prevId;
        console.log("Is array? " + isArray);
        if (isArray) {
            prevId = _.map(previous, function(val) {
                if (_.isNumber(val)) return val;
                return val.id;
            });
        } else prevId = [_.isNumber(previous) ? previous : previous.id];

        return readyPromise.then(function() {
            var itms = getByIds(prevId);
            console.log(itms);

            function getItems() {
                if (isArray) return { _stWrapped: true, val: itms};

                return { _stWrapped: true, val: itms.length ? itms[0] : null };
            }

            if (!flags.noRefresh) {
                return Promise.all(_.map(itms, function(item) {
                    return item.refresh();
                })).then(getItems);
            }

            return getItems();
        }).then(function(val) {
            console.log("PRECALC", val);
            return val;
        });
    }.bind(this)));

    return res;
}

module.exports = publicModel;