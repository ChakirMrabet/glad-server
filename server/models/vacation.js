module.exports=function(Vacation){
	// Remote methods
	Vacation.delete=function(userId,dates,cb){
		Vacation.destroyAll({			
			date:{
				inq:dates
			},
			userId:userId
		},function(error,info){
			if(error) throw error;
			cb(null,info);
		});
	}
	Vacation.remoteMethod('delete',{
		accepts:[{arg:'userId','type':'number'},{arg:'dates','type':'object'}],
		returns: {arg: 'response', type: 'string'},
		http:{path:'/delete',verb:'post'}
	});
};
