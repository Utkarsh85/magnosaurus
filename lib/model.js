const populate = require("./populate");
const find = require("./find");
const ObjectId= require('mongodb').ObjectId;

let model = function({
	schema,
	indexes,
	modelName,
	reference,
	toJSON,
	filterUpdate,
	beforeWrite,
	addTimeStamps = true
}, getDb, ajv, ajvWithouDefaults) {
	
	//setting getDb and ajv
	this._getDb= getDb;
	this._ajv= ajv;
	this._ajvWithouDefaults = ajvWithouDefaults;

	//checks
	if(!schema)
		schema= {properties:{}};
	if(!modelName)
		throw new Error("modelName must be specified");
	if(toJSON && typeof(toJSON)!== "function")
		throw new Error("toJSON must be a function");
	if(filterUpdate && typeof(filterUpdate)!== "function")
		throw new Error("filterUpdate must be a function");
	if(beforeWrite && typeof(beforeWrite)!== "function")
		throw new Error("beforeWrite must be a function");
	if(reference && typeof(reference)!="object")
		throw new Error("reference must be a object");
	if(reference && Object.keys(reference).reduce((r,v)=>{r+=reference[v].hasOwnProperty("model")?1:0;return r;},0)!=Object.keys(reference).length)
		throw new Error("model not defined for a reference");

	if(reference)
	{
		for(var key in reference)
		{
			schema.properties[key]= {isObjectId:true};
		}
	}

	this._schema = schema;
	this._validate = this._ajv.compile(schema);
	this._validateWithouDefaults = this._ajvWithouDefaults.compile(schema);
	this._modelName = modelName;
	this._indexes = indexes;
	this._toJSON = toJSON;
	this._beforeWrite = beforeWrite;
	this._filterUpdate = filterUpdate;
	this._reference = reference;
	this._addTimeStamps = addTimeStamps;

}

model.prototype.valid = function(data,useDefaults=true) {
	const self = this;
	return new Promise(function(resolve, reject) {

		let valid;
		if(useDefaults)
			valid = self._validate(data);
		else
			valid = self._validateWithouDefaults(data);

		if (!valid)
		{
			if(useDefaults)
				return reject(self._validate.errors);
			else
				return reject(self._validateWithouDefaults.errors)
		}
		else
			return resolve(data);
	});
}

model.prototype.beforeCreateValidate = function(data) {
	const self = this;
	return self.valid(data).then(data => {
		if (self._addTimeStamps) {
			data.createdAt = new Date();
			data.updatedAt = new Date();
		}
		return data;
	});
}


model.prototype.toJSON = function(data) {
	return this._toJSON(data);
}

model.prototype.populate = function(data, populateArr) {
	return populate(this._reference,this._getDb)(data, populateArr);
}

model.prototype.beforeUpdateValidate = function(data, useFilterUpdate = true) {
	const self = this;
	let toUpdate = data;

	if (useFilterUpdate && this._filterUpdate)
		toUpdate = this._filterUpdate(data);

	return self.valid(toUpdate,false).then(data => {
		if (self._addTimeStamps) {
			data.updatedAt = new Date();
		}
		return data;
	});
}

model.prototype.createIndexes = async function() {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	if (self._indexes)
		return await Model.createIndexes(self._indexes);
	else
		return null;
}

model.prototype.find = function(query,projection) {

	return new find(this._modelName,query,projection,this._getDb);
}

model.prototype.count = async function(query) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);

	return await Model.count(query);
}

model.prototype.findOne = async function(query) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);

	return await Model.findOne(query);
}

model.prototype.insertOne = async function(data,findDocs=true) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	
	if(self._beforeWrite)
		data= self._beforeWrite(data);

	// console.log(data);

	const toBeCreatedData= await self.beforeCreateValidate(data);
	const insertRes= await Model.insertOne(toBeCreatedData);
	if(findDocs)
		return await Model.findOne({_id:insertRes.insertedId});
	else
		return insertRes;
}

model.prototype.insertMany = async function(data,findDocs=true) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);

	if(self._beforeWrite)
		data= data.map(self._beforeWrite.bind(self));

	const toBeCreatedData= await Promise.all(data.map(self.beforeCreateValidate.bind(self)));
	const insertRes= await Model.insertMany(toBeCreatedData);
	if(findDocs)
		return await Model.find({_id:{$in:Object.values(insertRes.insertedIds)}}).toArray();
	else
		return insertRes;
}

model.prototype.updateOne = async function(query,data,options={},findDocs=true) {
	if(typeof(options)=="boolean")
	{
		findDocs= options;
		options={};
	}
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	if(data.hasOwnProperty('$set'))
	{
		if(self._beforeWrite)
			data.$set= self._beforeWrite(data.$set);

		data.$set= await self.beforeUpdateValidate(data.$set);
	}

	const doc= await Model.findOne(query);
	if(doc)
	{
		const updateRes= await Model.updateOne({_id: doc._id},data,options);
		if(findDocs)		
			return await Model.findOne({_id: doc._id});
		else
			return updateRes;
	}
	else
		return null;
}

model.prototype.updateMany = async function(query,data,options={},findDocs=true) {
	if(typeof(options)=="boolean")
	{
		findDocs= options;
		options={};
	}
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	if(data.hasOwnProperty('$set'))
	{
		if(self._beforeWrite)
			data.$set= self._beforeWrite(data.$set);

		data.$set= await self.beforeUpdateValidate(data.$set);
	}

	const docs= await Model.find(query,{_id:1}).toArray();
	if(docs && docs.length > 0)
	{
		const updateRes= await Model.updateMany({_id: {$in:docs.map(x=>x._id)}},data,options);
		if(findDocs)
			return await Model.find({_id: {$in:docs.map(x=>x._id)}}).toArray();
		else
			return updateRes;
	}
	else
		return [];
}

model.prototype.deleteOne = async function(query) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	const doc= await Model.findOne(query);
	if(doc)
	{
		await Model.deleteOne({_id: doc._id});
		return doc;
	}
	else
		return null;
}

model.prototype.deleteMany = async function(query) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	const docs= await Model.find(query,{_id:1}).toArray();
	if(docs && docs.length > 0)
	{
		await Model.deleteMany({_id: {$in:docs.map(x=>x._id)}});
		return docs;
	}
	else
		return [];
}

model.prototype.distinct = async function(field,query) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	return await Model.distinct(field,query);
}

model.prototype.createOrUpdateOne = async function(query,data) {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	const doc= await Model.findOne(query);
	if(doc)
	{
		if(self._beforeWrite)
			data= self._beforeWrite(data);

		const toBeUpdatedData= await self.beforeUpdateValidate(data);
		await Model.updateOne({_id: doc._id},{$set:toBeUpdatedData});
		return await Model.findOne(query);
	}
	else
	{
		if(self._beforeWrite)
			data= self._beforeWrite(data);

		const toBeCreatedData= await self.beforeCreateValidate(data);
		await Model.insertOne(toBeCreatedData);
		return await Model.findOne(query);
	}
}

model.prototype.model = async function() {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	return Model;
}

model.prototype.ObjectId= function(id)
{
	return ObjectId(id);
}

model.prototype.oid= function(id)
{
	return ObjectId(id);
}

module.exports = model;