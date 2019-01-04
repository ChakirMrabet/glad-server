module.exports=function(Group){

	Group.delete=function(dayOff,dates,cb){
		Group.destroyAll({			
			date:{
				inq:dates
			},
			dayOff:dayOff
		},function(error,info){
			if(error) throw error;
			cb(null,info);
		});
	}

	Group.remoteMethod('delete',{
		accepts:[{arg:'dayOff','type':'number'},{arg:'dates','type':'object'}],
		returns: {arg: 'response', type: 'string'},
		http:{path:'/delete',verb:'post'}
	});

};
