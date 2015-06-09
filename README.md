# ![Starmap](http://i.imgur.com/AHjZOch.png "Starmap")

## [Getting Started](#getting-started) - [Documentation](#documentation)

Starmap is a client-side framework to make real-time communication with [Sails](https://github.com/balderdashy/sails) easy. It attempts to implement a client-side representation of some of the models and tables on the server, updated in real-time using Sails' websocket support.

Starmap's primary purpose is to provide an automagically updating interface that can be used with other client-side frameworks like [AngularJS](https://angularjs.org/) and [EmberJS](http://emberjs.com/), but while also being framework agnostic (it doesn't _need_ a specific framework, and doesn't even need one at all).

## Installation

Install with [NPM](http://npmjs.com/) to use with [Browserify](http://browserify.org/):

```shell
npm install starmapjs --save
```

```js
var starmap = require('starmapjs');
```

Install with [Bower](http://bower.io/):

```shell
bower install starmapjs --save
```

```html
<script src="bower_components/starmapjs/dist/starmap.min.js"></script>
```

Use the CDN provided by [RawGit](https://rawgit.com/):

```html
<script src="https://cdn.rawgit.com/mrfishie/starmap/master/dist/starmap.min.js"></script>
```

## Getting Started

> **For Browserify users:** if you are using Sails.io.js as a Node module, you will need to pass the `io` object from this module to Starmap, because it will not be declared globally. For example,

> ```js
> var socketIO = require('socket.io-client');
> var io = require('sails.io.js')(socketIO);
> var starmap = require('starmap')(io);
> ```

> Notice that the object returned from Socket.io is passed to Sails.io.js, which is passed to Starmap.js

### Basics

To access all instances belonging to a certain model, call Starmap as a function:

```js
var users = starmap("User");
```

This will return an array of all users, that updates automatically.

We can perform modifications on this list, and any instances. For example, we can create a new instance:

```js
var newUser = users.create({
	name: "Bob",
	age: 23,
	email: "example@example.com"
});
newUser.then(function() {
	console.log("User created");
});
```

This will add the new user to the list. Now, we can perform some modifications on the user and save them:

```js
newUser.name = "Charlie";
newUser.save().then(function() {
	console.log("User updated");
});
```

And we can delete it:

```js
newUser.delete().then(function() {
	console.log("User deleted");
});
```

### Properties

We can tell Starmap to assign some client-side-only properties to all instances by passing in an object to the `starmap` function. This can be used, for example, to provide some utility functions.

```js
var users = starmap("User", {
	getFullName: function() {
		return this.firstName + " " + this.lastName;
	},
	foobar: false
});

var firstUsersName = users[0].getFullName();
users[0].foobar = true;
```
In this case, `getFullName` and `foobar` will not be synced to the server and will override any properties from the server, but cannot be changed.

We can also add properties on the model array itself, by passing a third argument.

```js
var users = starmap("User", {}, {
	getTeenagers: function() {
		return this.filter({ age: { '<': 20 } });
	}
});
```

### Connections

We can also inform Starmap that a model connections to another model, allowing us to browse complex object relationships.

```js
var users = starmap("User", {
	posts: starmap("Post")
});
var posts = starmap("Post", {
	author: starmap("User")
});

users.forEach(function(user) {
	console.log(
		user,
		user.posts.map(function(itm) {
			return itm.text;
		}).join(", ")
	);
});
```

We can easily create connections:

```js
var newPost = posts.create({
	text: "Such post!",
	author: users[0]
});
newPost.then(function() {
	console.log(
		"User has post?",
		users[0].posts.contains(newPost) // will be true
	);
});
```

And then modify connections:

```js
newPost.author = users[1];
newPost.save().then(function() {
	console.log(
		"User 0 has post?",
		users[0].posts.contains(newPost) !== -1 // will be false
	);

	console.log(
		"User 1 has post?",
		users[1].posts.contains(newPost) !== -1 // will be true
	);
});
```

Or, we can do:

```js
users[0].posts.splice(users[0].posts.indexOf(newPost), 1);
users[1].posts.push(newPost);

users[0].save();
users[1].save();
```

## Documentation

 - [`starmap`](#starmap)
 - [`Model`](#model)
 - [`ModelInstance`](#modelinstance)

### `starmap`

##### `starmap(object io)` -> `function`

If a global variable `io` is not defined, you must pass one in. Returns:

##### `starmap(string name[, object itemDef[, object modelDef]])` -> `Model`

##### `starmap.model(string name[, object itemDef[, object modelDef]])` -> `Model`

Fetches all model instances under `name`. Properties in `itemDef` are applied to all model instances but not synced to the server, and properties in `modelDef` are copied to the `Model` object.

##### `starmap.create(string name[, object props])` -> `ModelInstance`

Creates a new instance of a model. Alias of `Model#create`.

##### `starmap.find(string name, object filter)` -> `Model`

Finds all items in the model that match the filter. Alias of `Model#find`.

##### `starmap.findOne(string name, object filter)` -> `Promise`

Finds one item that matches the filter. Alias of `Model#findOne`.

##### `starmap.calculate(function func<previous, object flags>[, object subProps])` -> `object`

Create a calculation property. When an instance changes, the function will be called and the return value will be placed into the property. If the function returns a promise, the promise will be waited for and then the resolved value will be placed into the property.

The functions context will be the model instance it is being applied on.

`previous` is the value that the property had from the server, if any.

`flags` is an object containing flags that pertain to the behaviour of your function. The flags are:

 - `noRefresh` - if `true`, you should not refresh any model instances. This will be set if a calculation function causes a refresh which causes the function to be called again.

`subProps` are properties that will be added to the returned object (i.e the one from this function, not from the return value of `func`). This can be used to create a multi-purpose object that can also be used for precalculation. One example of this in Starmap is connections.

For example, to have a property that calculates a persons name:

```js
var users = starmap("User", {
	fullName: starmap.calculate(function() {
		return this.firstName + " " + this.lastName;
	});
});
```

### `Model`

##### `Model#_isModel` -> `bool`

Always `true`, specifying that this is a model list.

##### `Model#name` -> `string`

The name of the model that this list is fetched from.

##### `Model#ready` -> `Promise`

A promise that is resolved when all model instances have been fetched and processed.

##### `Model#create([object props])` -> `ModelInstance`

Creates a new model instance using the specified properties. This instance will automatically be synced to the server with the properties specified.

##### `Model#itemById(int id)` -> `ModelInstance`

Gets a model instance by its unique ID. If no model has this ID, returns `false`.

##### `Model#find(object filter)` -> `Model`

##### `Model#filter(object filter)` -> `Model`

Returns a new model list that is only populated with items that match the provided filter. These sub-models are also automatically updated, can have children added to them, and can be sub-filtered.

The filter should be in the format accepted by Waterline, Sails' ORM. For information regarding this filter, consult [the Sails documentation](http://sailsjs.org/#!/documentation/concepts/ORM/Querylanguage.html).

**Note:** If a sort parameter is provided to the filter, there is no guarantee that any instances added after the sort occurred will be added in the sorted order.

##### `Model#findOne(object filter)` -> `Promise`

Finds a single instance that matches the specified filter. If no item matches, the promise will be resolved with `false`.

The filter should be in the format accepted by Waterline, Sails' ORM. For information regarding this filter, consult [the Sails documentation](http://sailsjs.org/#!/documentation/concepts/ORM/Querylanguage.html).

##### `Model#refresh()` -> `Promise`

Forces a refresh of all instances in the model (doesn't actually refresh the model list itself, though).

##### `Model#then(function resolvedCallback, function rejectedCallback)` -> `Promise`

An alias for `Model#ready.then()`. Note that the promise is returned, not the model.

##### `Model#catch(function callback)` -> `Promise`

An alias for `Model#ready.catch()`. Note that the promise is returned, not the model.

### `ModelInstance`

##### `ModelInstance#_isModelItem` -> `bool`

Always `true`, specifying that this is a model instance.

##### `ModelInstance#ready` -> `Promise`

A promise that is resolved when the model instance has been fetched. For items directly from a model, this will always be resolved, however it can be used when creating an instance.

##### `ModelInstance#model` -> `Model`

The model that this instance belongs to.

##### `ModelInstance#update(object data[, bool sync])` -> `Promise`

Updates the model instance to have the properties specified. If `sync` is not supplied or is `true`, the instance will be synced with the server and the promise will be resolved when this is complete. Otherwise, the promise will be resolved after any precalc functions are complete.

##### `ModelInstance#save()` -> `Promise`

Saves the instance, and creates it on the server if it doesn't exist for some reason. Any model instances referenced with connections will also be **updated** (not saved) after the saving is complete, to account for two-way connections.

##### `ModelInstance#refresh()` -> `Promise`

Forces a refresh on the instance.

##### `ModelInstance#delete()` -> `Promise`

Deletes the instance on the server.

##### `ModelInstance#matches(object query)` -> `Promise`

Finds if the model matches a certain Waterline query. For information regarding this query language, consult [the Sails documentation](http://sailsjs.org/#!/documentation/concepts/ORM/Querylanguage.html).

##### `ModelInstance#then(function resolvedCallback, function rejectedCallback)` -> `Promise`

An alias for `ModelInstance#ready.then()`. Note that the promise is returned, not the model.

##### `ModelInstance#catch(function callback)` -> `Promise`

An alias for `ModelInstance#ready.catch()`. Note that the promise is returned, not the model.
