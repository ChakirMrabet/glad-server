var Promise=require('bluebird');

'use strict';

// Define models to sync with database
var models=[
	'Log',
	'User',
	'AccessToken',
	'ACL',
	'RoleMapping',
	'Role',
	'Profile',
	'Department',
	'Machine',
	'MachineUser',
	'DepartmentMachine',
	'DepartmentWorkcenter',
	'MachineMapping',
	"WorkCenter",
	"Day",
	"Shift",
	"ShiftUser",
	"ShiftAllocation",
	"Group",
	"Schedule",
	"Signup",
	"SignupMod",
	"Vacation",
	"Setting"
];

module.exports=function(app){
	// Remove email verification requirement from the User model
	// since they will authenticate with username instead
	delete app.models.User.validations.email;

	// Check if database changes are required
	app.dataSources.mysqlDS.isActual(models,function(error,actual){
		if(error) throw error;

		if(!actual){
			// Create Admin user and role
			createModels(app);	
		}else{
			console.log('Database schema is up to date.');
		}
	});
}

// This function creates the tables for the models and the admin user and role
function createModels(app){
	var roleAdmin={
			name:'admin',
			description:'Superuser role, gives all privileges to all content and to all sections'
		},
		roleEmployee={
			name:'employee',
			description:'Employee role, gives access to own content only and to "My Tools" section only'
		},
		roleSupervisor={
			name:'supervisor',
			description:'Supervisor role, gives access to own content and to "My Tools" and "Plant Tools" sections'
		},
		adminUser={
			username:'admin',
			password:'admin',
			email:'',
			firstname:'-',
			lastname:'-',
			hireDate:Date.now()	
		};

	// Create tables for models and adds user Admin
	app.dataSources.mysqlDS.autoupdate(models)
	.then(function(){
		// Create all the roles
		Promise.all([
			app.models.Role.create(roleEmployee),
			app.models.Role.create(roleSupervisor),
			app.models.Role.create(roleAdmin)
		])
		.spread(function(roleEmployee,roleSupervisor,roleAdmin){
			app.models.User.create(adminUser)
			.then(function(user){
				// Add role mappings
				Promise.all([
					roleAdmin.principals.create({
						principalType: app.models.RoleMapping.USER,
						principalId: user.id
					})					
				])
				.then(function(){
					console.log('Database schema updated.');
					// Override the User model's ACL rules
					overrideUserACL(app);
					overrideRoleACL(app);
					overrideRoleMappingACL(app);
					// Populate the Setting table with the default data
					createSettings(app);
					// Create file container for the avatars
					createAvatarContainer(app);
				})
				.catch(function(error){
					console.log(error);
				});
			})
			.catch(function(error){
				console.log(error);
			});
		})
		.catch(function(error){
			console.log(error);
		});
	})
	.catch(function(error){
		console.log(error);
	});
}

function createSettings(app){
	var Setting=app.models.Setting;

	var colors=[
		{"description":"General"},
		{"name":"Past Days","value":"#222222"},
		{"name":"Pay Day","value":"#06b606"},
		{"name":"Holidays","value":"#800404"},
		{"name":"Non-Working Days","value":"#030385"},
		{"description":"Sign Ups"},
		{"name":"Shift","value":"#daa0db"},
		{"name":"Pending Signup","value":"#132D3F"},
		{"name":"Approved Signup","value":"#197ebb"},
		{"description":"Vacation"},
		{"name":"Pending Vacation","value":"#4b6b38"},
		{"name":"Approved Vacation","value":"#5ce907"},
		{"name":"Rejected Vacation","value":"#e65c75"}
	];
	Setting.create({
		apiUrl:'localhost',
		apiPort:'3000',
		name: 'Online Scheduler',
		company: 'Glad Manufacturing',
		address: 'Amherst (VA)',
		version:{
			major: 1,
			minor: 0,
			bug: 0,
			stage: 'b'
		},
		colors:colors,
		startLockDay:2,
		endLockDay:3
	}).catch(function(error){
		console.log(error);
	});
}

function createAvatarContainer(app){
	var FileContainer=app.models.FileContainer;
	// Create a file container where to store users' avatarts
	FileContainer.getContainer('avatars',function(error,container){
		if(container==null){
			FileContainer.createContainer({name:'avatars'},function(error,container){
				if(error) throw error;
			});			
		}
	});
}

function overrideAllACL(app){
	var ACL=app.models.ACL;

	ACL.create({
		model: '*',
		property: '*',
		accessType: '*',
		principalType: 'ROLE',
		principalId: '$unauthenticated',
		permission: 'DENY'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});
}

function overrideUserACL(app){
	var ACL=app.models.ACL;

	// Authenticated users have find access to all users
	ACL.create({
		model: 'User',
		property: '*',
		accessType: 'READ',
		principalType: 'ROLE',
		principalId: '$authenticated',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});

	ACL.create({
		model: 'User',
		property: 'getComplete',
		accessType: 'READ',
		principalType: 'ROLE',
		principalId: '$authenticated',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});

	// Admin has full access to users
	ACL.create({
		model: 'User',
		property: '*',
		accessType: '*',
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});
	
}

function overrideRoleACL(app){
	var ACL=app.models.ACL;

	// Authenticated users has read access to only their content
	ACL.create({
		model: 'Role',
		property: '*',
		accessType: 'READ',
		principalType: 'ROLE',
		principalId: '$authenticated',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});

	// Admin has full access to roles
	ACL.create({
		model: 'Role',
		property: '*',
		accessType: '*',
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});

}

function overrideRoleMappingACL(app){
	var ACL=app.models.ACL;

	// Authenticated users has read access to only their content
	ACL.create({
		model: 'RoleMapping',
		property: '*',
		accessType: 'READ',
		principalType: 'ROLE',
		principalId: '$authenticated',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});

	// Admin has full access to roles
	ACL.create({
		model: 'RoleMapping',
		property: '*',
		accessType: '*',
		principalType: 'ROLE',
		principalId: 'admin',
		permission: 'ALLOW'
	},function (error,acl) { // Create the acl
		if(error) throw error;
	});
	
}