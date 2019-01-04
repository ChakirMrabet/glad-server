var _=require('lodash'),
	Promise=require('bluebird'),
	moment=require('moment');

module.exports=function(app){

	var Log=app.models.Log,
		User=app.models.User,
		Role=app.models.Role,
		RoleMapping=app.models.RoleMapping,
		Profile=app.models.Profile,
		Department=app.models.Department,
		DepartmentWorkcenter=app.models.DepartmentWorkcenter,
		WorkCenter=app.models.WorkCenter,
		Shift=app.models.Shift,
		Machine=app.models.Machine;

	// Users/deleteAll
	// Deletes all users except the admin
	User.deleteAll=function(cb){
		User.destroyAll({id:{neq:1}})
		.then(function(){
			cb(null,'All users deleted');
		})
		.catch(function(error){
			cb(error);
		});
	}

	User.remoteMethod('deleteAll',{
		http:{path:'/deleteAll',verb:'get'}
	});

	// Users/import
	// Import one user
	User.import=function(user,roles,cb){		
		// Make sure there is an user provided


		if(user){
			// Prepare the values before inserting
			const username=_.trim(_.find(user,{name:'username'}).value);
			const password=username.toString(); 
			const name=_.find(user,{name:'name'}).value;
				const nameSplit=_.split(name,',');
			const hireDate=_.find(user,{name:'hireDate'}).value;
			const email=_.trim(_.toLower(_.find(user,{name:'email'}).value));
			const department=_.trim(_.toUpper(_.find(user,{name:'department'}).value));
			const shift=_.trim(_.toUpper(_.find(user,{name:'shift'}).value));
			const workCenter=_.trim(_.toUpper(_.find(user,{name:'workCenter'}).value));
			const pMachine=_.trim(_.toUpper(_.find(user,{name:'pMachine'}).value));
			const sMachine=_.trim(_.toUpper(_.find(user,{name:'sMachine'}).value));
			const vacation=_.trim(_.find(user,{name:'vacation'}).value);
			const sick=_.trim(_.find(user,{name:'sick'}).value);
			const personal=_.trim(_.find(user,{name:'personal'}).value);
			const floating=_.trim(_.find(user,{name:'floating'}).value);
			const role=_.trim(_.find(user,{name:'role'}).value);

			// Create the new user if it doesn't exist
			if(username && username!=''){
				User.findOrCreate({where:{username:username}},{
					username: username,
					password: username,
					firstname: _.trim(nameSplit[0]),				// Remove white spaces 
					lastname: _.trim(nameSplit[1]),
					vacation:vacation,
					sick:sick,
					personal:personal,
					floating:floating,
					roleId:_.find(roles,{name:role}).id,		// Employee
					email,
					hireDate				
				},function(error,userInstance,created){					
					if(error) throw error;

					// Work Center
					WorkCenter.findOrCreate({where:{name:workCenter}},{
						name: workCenter,
						description: '',
						notes: ''
					},function(error,workCenterInstance,created){
						// Create Machines
						let machinePromises=[];

						if(role=='employee'){

							machinePromises.push(
								Machine.findOrCreate({where:{name:pMachine}},{
									name: pMachine,
									description: '',
									notes: '',
									workCenterId: workCenterInstance.id
								})
							);

							if(sMachine!=''){
								machinePromises.push(
									Machine.findOrCreate({where:{name:sMachine}},{
										name: sMachine,
										description: '',
										notes: '',
										workCenterId: workCenterInstance.id							
									})
								);
							}

						}

						Promise.all(machinePromises).spread(function(pMachineInstance,sMachineInstance){

							// Check department, if exists link, if not, create
							
							Department.findOrCreate({where:{name:department}},{
								name: department,
								description: '',
								notes: ''
							},function(error,departmentInstance,created){
								if(error) throw error;

								DepartmentWorkcenter.findOrCreate({where:{
									departmentId: departmentInstance.id,
									workCenterId: workCenterInstance.id
								}},{
									departmentId: departmentInstance.id,
									workCenterId: workCenterInstance.id
								},function(){
									// Shift
									Shift.findOrCreate({where:{name:shift}},{
										name: shift,
										type:2,
										description: '',
										notes: '',
										days: []
									},function(error,shiftInstance,created){
										userInstance.updateAttributes({
											firstname: userInstance.firstname,
											lastname: userInstance.lastname,
											hireDate: userInstance.hireDate,
											departmentId: departmentInstance.id,
											shiftId: shiftInstance.id,
											machineId: pMachineInstance ? pMachineInstance[0].id : null,
											secondaryMachineId: sMachineInstance ? sMachineInstance[0].id : null
										},function(error){
											if(error) throw error;
											cb(null);
										});
									});
								});								
							});
						});
					});
				});
			}else{
				cb(null);
			}
		}else{
			cb('No user provided for importation');
		}
	}

	User.remoteMethod('import',{
		accepts: [{arg:'user',type:'object'},{arg:'roles',type:'object'}],
		http:{path:'/import',verb:'post'}
	});


	// Users/getRoles
	// Returns the Roles for a certain user provided his id
	User.getRoles=function(id,cb){
		if(id){
			RoleMapping.find({where:{principalId:id}})
			.then(function(roleMappings){
				if(roleMappings.length){
					var roleIds=_.uniq(roleMappings.map(function(roleMapping){
					    return roleMapping.roleId;
					}));
					var conditions=roleIds.map(function(roleId){
					  return {id:roleId};
					});
					Role.find({where:{or:conditions}})
					.then(function(roles){
						cb(null,roles);
					})
					.catch(function(error){
						cb(error);
					});
				}else{
					cb('No associated roles were found for user with id '+id);
				}
			})
			.catch(function(error){
				cb(error);
			});
		}else{
			cb('No user id was provided');
		}
	}

	User.remoteMethod('getRoles',{
		accepts: {arg:'id',type:'number'},
		returns: {arg:'roles',type:'Object'},
		http: {path:'/getRoles',verb:'get'},		
	});

	// Users/getProfile
	// Returns the profile a certain user ID has
	User.getProfile=function(id,cb){
		if(id){
			User.findById(id)
			.then(function(user){
				if(user){
					Profile.findById(user.profileId)
					.then(function(profile){
						if(profile){
							cb(null,profile);
						}else{
							cb('No profile was found for user with id '+id);
						}
					})
					.catch(function(error){
						cb(error);
					});
				}else{
					cb('No user was found with id '+id);
				}
			})
			.catch(function(error){
				cb(error);
			});
		}else{
			cb(null,{'error':'No user id provided'});
		}
	}

	User.remoteMethod('getProfile',{
		accepts:{arg:'id','type':'number'},
		returns:{arg:'profile',type:'object'},
		http:{path:'/getProfile',verb:'get'}
	});

	// Users/getComplete
	// Returns a user object with all the related models
	User.getComplete=function(id,cb){
		if(id){
			User.findById(id)
			.then(function(user){
				if(user){
					// Get Roles and Profiles
					var promises=[
						Profile.findById(id),			
						getUserRoles(id)
					];

					if(user.departmentId){
						promises.push(Department.findById(user.departmentId));
					}

					if(user.shiftId){
						promises.push(Shift.findById(user.shiftId));
					}

					if(user.machineId){
						promises.push(Machine.findById(user.machineId));
					}

					Promise.all(promises)
					.spread(function(profile,roles,department,shift,machine){
						// Conform the object to return
						user.profile=profile;
						user.department=department;
						user.machine=machine;
						user.shift=shift;
						user.roles=roles;
						// Return new object
						cb(null,user);
					})
					.catch(function(error){
						cb(error);
					});
				}else{
					cb('No user was found with id '+id);
				}
			})
			.catch(function(error){
				cb(error);
			});
		}else{
			cb('No user id was provided');
		}
	}

	User.remoteMethod('getComplete',{
		accepts:{arg:'id','type':'number'},
		returns:{arg:'user',type:'object'},
		http:{path:'/getComplete',verb:'get'}
	});

	// Users/getCompleteAll
	// Returns all users objects with all their related models
	User.getCompleteAll=function(cb){
		User.find()
		.then(function(users){
			if(users.length){
				var userQueries=users.map(function(user){
					return getUserFullData(user);
				});
				// Get Roles and Profiles
				Promise.all(userQueries)
				.then(function(data){
					// Conform the object to return
					cb(null,data);
				})
				.catch(function(error){
					cb(error);
				});
			}else{
				cb('No users were found in the database');
			}
		})
		.catch(function(error){
			cb(error);
		});
	}

	User.remoteMethod('getCompleteAll',{
		returns:{arg:'users',type:'object'},
		http:{path:'/getCompleteAll',verb:'get'}
	});

	// This is a hook that observes before a user is created in order to create a profile 
	// and link to it
	User.observe('before save',function(ctx,next){
		var Profile=User.app.models.Profile;

		// ctx.instance contains data when creating
		// ctx.instance = null when updating
		// ctx.data contains data when updating
		// ctx.isNewInstance is true when creating
		// ctx.isNewInstance is undefined when updating
		if(ctx.instance){	// CREATE
			// Add Profile				
			Profile.create({
				firstname:ctx.instance.firstname,
				lastname:ctx.instance.lastname,
				hireDate:ctx.instance.hireDate,
				vacation:ctx.instance.vacation,
				sick:ctx.instance.sick,
				personal:ctx.instance.personal,
				floating:ctx.instance.floating,
				avatar:ctx.instance.avatar
				// Other profile fields go here
			},function(error,profile){
				if(error) throw error;
				ctx.instance.profileId=profile.id;
				next();
			});
		}else{		// UPDATE
			Profile.findById(ctx.currentInstance.profileId,function(error,profile){
				if(error) throw error;

				if(ctx.data){
					// Update profile
					profile.updateAttributes({
						firstname:ctx.data.firstname,
						lastname:ctx.data.lastname,
						hireDate:ctx.data.hireDate,
						vacation:ctx.data.vacation,
						sick:ctx.data.sick,	
						personal:ctx.data.personal,
						floating:ctx.data.floating,
						avatar:ctx.data.avatar
					},function(error){
						if(error) throw error;
						next();
					});				
				}else{
					next();
				}
			});
		}
	});

	// This hook observes after a user is created in order to link it to a role 
	User.observe('after save',function(ctx,next){
		var RoleMapping=User.app.models.RoleMapping;

		// newInstance = true when creating new object
		// newInstance = false when updating existing object
		if(ctx.newInstance){	// CREATE
			// Add role				
			RoleMapping.create({
				principalId:ctx.instance.id,
				principalType:'USER',
				roleId:ctx.instance.roleId
			},function(error,roleMapping){
				if(error) throw error;

				Log.create({
					type:0,
					details:'User '+ctx.newInstance.username+' has been created.'
				});

				next();
			});
		}else{		// UPDATE

			RoleMapping.destroyAll({principalId:ctx.instance.id},function(error){
			
				if(error) throw error;

				// Create new one
				RoleMapping.create({
					principalId:ctx.instance.id,
					principalType:'USER',
					roleId:ctx.instance.roleId
				},function(error){
					if(error) throw error;

					// Add Log entry
					Log.create({
						type:0,
						details:'User '+ctx.instance.username+' profile has been updated.'
					});

					next();
				});
			});
		}
	});

	// This hook fires after the user has successfully logged in	
	User.afterRemote('login',function(ctx,user,next){
		// Store the remote address the user is connected at
		var ip=ctx.req.connection.remoteAddress,
			accessDate=Date.now(),
			Profile=User.app.models.Profile;
		
		User.findById(user.userId,function(error,fullUser){
			if(error) throw error;

			Profile.findById(fullUser.profileId,function(error,profile){
				if(error) throw error;

				profile.updateAttributes({
					last_access_ip:ip,
					last_access_on:accessDate
				},function(error){
					if(error) throw error;

					Log.create({
						type:0,
						details:'User '+fullUser.username+' logged in from '+ip+'.'
					});
					
					next();
				});
			});
		});
	});

	// This hook fires after the user has successfully logged in	
	User.afterRemote('logout',function(ctx,user,next){
		
		const userId=ctx.req.accessToken.userId;

		User.findById(userId,function(error,fullUser){
			if(error) throw error;
			Log.create({
				type:0,
				details:'User '+fullUser.username+' logged out.'
			});				
			next();
		});

	});	

	// *******************************************************************************
	// SUPPORTING FUNCTIONS
	// *******************************************************************************

	// This function returns an object with the roles of a certain user with a given id
	// The array contains the id, the name and description of the roles
	function getUserRoles(id){
		return RoleMapping.find({where:{principalId:id}})
		.then(function(roleMappings){
			var roleIds=_.uniq(roleMappings.map(function(roleMapping){
				return roleMapping.roleId;
			}));
			var conditions=roleIds.map(function(roleId){
				return {id:roleId};
			});
			return Role.find({where:{or:conditions}});
		});
	}

	// This function returns a promise that will return a full user object
	function getUserFullData(user){
		var id=user.id;
		// Get Roles and Profiles
		var promises=[
			Profile.findById(id),			
			getUserRoles(id)
		];

		if(user.departmentId){
			promises.push(Department.findById(user.departmentId));
		}

		if(user.shiftId){
			promises.push(Shift.findById(user.shiftId));
		}

		if(user.machineId){
			promises.push(Machine.findById(user.machineId));
		}

		return Promise.all(promises)
		.spread(function(profile,roles,department,shift,machine){
			var now=moment(),
				hired=moment(profile.hireDate),
				duration=moment.duration(now.diff(hired)),
				seniority=duration.humanize();

			// Conform the object to return
			user.profile=profile;
			user.department=department;
			user.machine=machine;
			user.shift=shift;
			user.roles=roles;
			user.seniority=seniority;
			return user;
		});
	}	

}


