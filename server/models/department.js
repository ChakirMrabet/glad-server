var Promise=require('bluebird');

//'use strict';

module.exports=function(Department){

	// ctx.instance contains data when creating
	// ctx.instance = null when updating
	// ctx.data contains data when updating
	// ctx.isNewInstance is true when creating
	// ctx.isNewInstance is undefined when updating
	Department.observe('after save',function(ctx,next){

		if(ctx.instance){	// CREATE
			var DepartmentWorkcenter=Department.app.models.DepartmentWorkcenter;
			var departmentId=ctx.instance.id;
			var workCenters=ctx.instance.selectedWorkCenters;

			if(workCenters && workCenters.length){
				var items=workCenters.map(function(workCenterId){
					return {
						departmentId:departmentId,
						workCenterId:workCenterId
					}
				});

				// Delete all work centers previously stored in the database before saving
				DepartmentWorkcenter.destroyAll({departmentId:departmentId},function(error){
					DepartmentWorkcenter.create(items,function(error){
						if(error) throw error;
						next();
					});
				});				
			}else{
				next();
			}

		}
	});	

	// /Departments/id
	Department.getWithUserCount=function(cb){

		Department.find({include:['users','machines']})
		.then(function(departments){			
			cb(null,departments);
		})
		.catch(function(error){
			cb(error);
		});
	}
	Department.remoteMethod('getWithUserCount',{
		description:'Returns all departments (like findAll) but including the number of users in them',
		returns:{arg:'departments',type:'object'},
		http:{path:'/getWithUserCount',verb:'get'}
	});


	Department.addMachines=function(id,machines,cb){
		Department.findById(id,function(error,department){
			if(error) throw error;

			machines.map(function(machine){
				department.machines.add(machine.value);
			});
			cb(null);			
		});

	}

	Department.remoteMethod('addMachines',{
		accepts:[{arg:'id','type':'number'},{arg:'machines','type':'object'}],
		http:{path:'/addMachines',verb:'post'}
	});
};
