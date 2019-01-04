'use strict';

// This installs a new route that returns the date and time in the server so it can be used
// by the client for all the operations

module.exports = function(app){
  	// Install the route and return
  	app.get('/getTime',function(req,res){
  		 // Get current time
  		var now=new Date();
  		// Return 
  		res.json({
  			time:now.getTime(),
  			year:now.getFullYear(),
  			month:now.getDate(),
  			day:now.getDay(),
  			hours:now.getHours(),
  			minutes:now.getMinutes(),
  			seconds:now.getSeconds()
  		});
  	});
};
