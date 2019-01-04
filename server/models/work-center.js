module.exports=function(WorkCenter){
	
	

	WorkCenter.observe('after save',function(ctx,next){
		var Log= WorkCenter.app.models.Log;
		if(ctx.newInstance){
			Log.create({
				type:0,
				details:'WorkCenter '+ctx.newInstance.name+' has been created.'
			});
			next();
		}else{		// UPDATE
			Log.create({
				type:0,
				details:'WorkCentner '+ctx.instance.name+' has been updated.'
			});
			next();
		}
	});


	WorkCenter.observe('before delete',function(ctx,next){
		var Log= WorkCenter.app.models.Log;
		var id=ctx.where.id;

		WorkCenter.findById(id,function(errror,wc){
			Log.create({
				type:0,
				details:'WorkCenter '+wc.name+' has been deleted.'
			});
			next();			
		});
	});
	
};
