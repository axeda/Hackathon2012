//set up parameters
var model_name ='AxedaDrone'   ;
var serial_number ='Drone007' ;
var arr = []    ;

//initialize the app and show the login screen
init = function () {
 $(".login").show()
 $("#content").hide()



                //axeda.js handles log in
                axeda.doLogin($("#username").val(), $("#password").val(), function () {

					$(".login").hide()
					$("#content").show()
                   repeatFetchData()
                }, function () {
                    alert("Error logging in.")
              
				})
}
//main function on loop of 3 seconds
repeatFetchData = function()   {
    fetchData()
	if(arr !=null){
	$("#bombmessage").html("")
	updateTable()
	fire()
	}
    setTimeout("repeatFetchData()", 3000)
}

fetchData = function(){
//sets up the promises which returns a json output

             axeda.callScripto('GET', "GetUAV", {model_name:model_name, serial_number:serial_number}, 2, function (json) {
			
			 var currentWeight = json.dataItems.payload.currentWeight //jsonPath(json, "$..currentWeight")
			 var initialWeight = json.dataItems.payload.initialWeight //jsonPath(json, "$..initialWeight")
			// console.log(json.dataItems.payload.currentWeight)
			 $("#payloadstart").html( "Initial Weight: "+initialWeight)
			 $("#payloadcurrent").html( "Current Weight: "+currentWeight)
			 
			 var loccurrent = json.dataItems.location.currentPoint.split(",")
			 loadMap(loccurrent[0], loccurrent[1], "#map")
			 }, "yes")
        
				 
}
//converts the string to an object
jsonifyString = function (json) {
            if (typeof json != "object" && json) {
                json = JSON.parse(json)
                if (json[0] != null) {
                    if (json[0].length > 1) {
                        json = JSON.parse(json[0])
                    }
                }
            }
            return json
        }
		
		updateTable = function(){
		console.log(arr.length)
			for (var i=0; i < arr.length; i++){
			console.log("test " +arr[i].name)
				switch(arr[i].name){
					case "initialWeight":
						document.getElementById('initialWeight').innerHTML = "Initial Weight: " + arr[i].value
						break
					case "currentWeight":
						document.getElementById('payloadcurrent').innerHTML ="Current Weight: " + arr[i].value
					break
					
				}
			}
		}
		
		fire = function(){
			$("#firebtn").live('click', function () {
				var weight = $("#dropText").val()
				 axeda.callScripto('POST', "DropPayloadService", {model_name:model_name, serial_number:serial_number, weight:weight}, 2, function () {}, "yes")
				 $("#bombmessage").html("Feed the orphans!!!!!")
				 repeatFetchData()
				 $("#dropText").html('')
				 
			})
		
		}
		
		loadMap = function(lat, lng, div) {
                              var width = 600
                              var height = 600
                              var newimg = new Image()
                              var src = {
                                             center : lat + "," + lng,
                                             zoom : 12,
                                             size : width + "x" + Math.floor(height),
                                             maptype : "roadmap",
                                             markers : "color:green|" + lat + "," + lng,
                                             sensor : false

                              }
                              var img = "http://maps.googleapis.com/maps/api/staticmap?";
                              img += $.param(src)
                              $(div).html(newimg)
                              $(newimg).attr('src', img);
               }
