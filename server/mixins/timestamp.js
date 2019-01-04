// *****************************************************************************
// Innerspec HelpDesk API
// Chakir Mrabet
// Innerspec Technologies, Inc. 
// ©2016, All Rights Reserved.
//
// server/mixins/timestamp.js
// Mixin that adds timestamp functionality to models
// All times are UTC
// *****************************************************************************

'use strict';

module.exports=function(Model,options){
	// Create createdOn and updatedOn properties set by default to DATE.NOW
	Model.defineProperty('created',{type:Date,default:Date.now(),description:'Time is in UTC!'});
	Model.defineProperty('updated',{type:Date,default:Date.now(),description:'Time is in UTC!'});

	// Add hook to update the "updated" property
	Model.observe('before save',function(ctx,next){
		if(ctx.instance){	// CREATE
			ctx.instance.updated=Date.now();
		}else{	// UPDATE
			ctx.currentInstance.updated=Date.now();
		}
		next();
	});
}