var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');

var getModel = require('./getModel');
var modelItem = require('./modelItem');

var arrayPop = Array.prototype.pop,
    arrayPush = Array.prototype.push,
    arrayShift = Array.prototype.shift,
    arraySplice = Array.prototype.splice,
    arrayUnshift = Array.prototype.unshift,
    arraySlice = Array.prototype.slice;

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
            for (var i = 0; i < this.length; i++) {
                if (this[i].id === id) return this[i];
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
            return Promise.all(_.map(this, function(item) {
                return item.refresh();
            }));
        } },

        then: { value: function() {
            return readyPromise.then.apply(readyPromise, arguments);
        } },

        catch: { value: function() {
            return readyPromise.catch.apply(readyPromise, arguments);
        } },

        /**
         * Override array modification properties
         */

        _pop: { value: arrayPop },

        pop: { value: function() {
            var lastItem = arrayPop.call(this);
            lastItem.delete();
            return lastItem;
        } },

        _push: { value: arrayPush },

        push: { value: function() {
            for (var i = 0; i < arguments.length; i++) {
                this.create(arguments[i]);
            }
            return this.length;
        } },

        _shift: { value: arrayShift },

        shift: { value: function() {
            var firstItem = arrayShift.call(this);
            firstItem.delete();
            return firstItem;
        } },

        _splice: { value: arraySplice },

        splice: { value: function(start, deleteCount) {
            var items = _.map(arraySlice.call(arguments, 2), function(itm) {
                var item = modelItem(itm, model);
                item.ready = item.update(itm);
                return item;
            });

            items.unshift(start, deleteCount);

            var removed = arraySplice.apply(this, items);
            for (var i = 0; i < removed.length; i++) removed.delete();
            return removed;
        } },

        _unshift: { value: arrayUnshift },

        unshift: { value: function() {
            return arrayUnshift.apply(this, _.map(arguments, function(itm) {
                var item = modelItem(itm, model);
                item.ready = item.update(itm);
                return item;
            }));
        } },

        __connection: { value: model.name }
    });

    //Object.defineProperties(res, );

    _.merge(res, utils.createCalculateProperty(function(previous, flags) {
        if (!previous) return;

        var isArray = _.isArray(previous), prevId;
        if (isArray) {
            prevId = _.map(previous, function(val) {
                if (_.isNumber(val)) return val;
                return val.id;
            });
        } else prevId = [_.isNumber(previous) ? previous : previous.id];

        return readyPromise.then(function() {
            var itms = getByIds(prevId);

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
        });
    }.bind(this)));

    return res;
}

module.exports = publicModel;