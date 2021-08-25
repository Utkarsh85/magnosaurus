const getDb = require("../db/getDb");

let find= function(query,projection={},getDb) {
	if(!query) throw new Error("query must be provided to find api");
	this._query= query;
	this._projection= projection;
	this._getDB= getDb;
	return this;
}

find.prototype.sort= function(sort) {
	this._sort= sort;
	return this;
}

find.prototype.skip= function(skip) {
	this._skip= skip;
	return this;
}

find.prototype.limit= function(limit) {
	this._limit= limit;
	return this;
}

find.prototype.count= async function() {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	let query=Model.find(self._query,self._projection);

	if(this._sort)
		query= query.sort(this._sort);
	if(this._limit)
		query= query.limit(this._limit);
	if(this._skip)
		query= query.skip(this._skip);

	return await query.count();
}

find.prototype.toArray= async function() {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	let query=Model.find(self._query,self._projection);

	if(this._sort)
		query= query.sort(this._sort);
	if(this._limit)
		query= query.limit(this._limit);
	if(this._skip)
		query= query.skip(this._skip);

	return await query.toArray();
}

find.prototype.cursor= async function() {
	const self = this;
	const db= await self._getDb.getDb();
	const Model= await db.collection(self._modelName);
	let query=Model.find(self._query,self._projection);

	if(this._sort)
		query= query.sort(this._sort);
	if(this._limit)
		query= query.limit(this._limit);
	if(this._skip)
		query= query.skip(this._skip);

	return query;
}

module.exports= find;