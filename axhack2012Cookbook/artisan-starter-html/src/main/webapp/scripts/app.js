//set up parameters
var model_name =''   ;
var serial_number ='' ;
var arr = []    ;

//initialize the app and show the login screen
init = function () {
 $(".login").show()
 $("#content").hide()


$("#btnlogin").live('click', function () {
                //axeda.js handles log in
                axeda.doLogin($("#username").val(), $("#password").val(), function () {

					$(".login").hide()
					$("#content").show()
                   repeatFetchData()
                }, function () {
                    alert("Error logging in.")
                })
                
				})
}
//main function on loop of 3 seconds
repeatFetchData = function()   {
    fetchData()
    setTimeout("repeatFetchData()", 3000)
}

fetchData = function(){
//sets up the promises which returns a json output
 var promises = [
             axeda.callScripto('GET', "json", {model_name:model_name, serial_number:serial_number}, 2, function (json) {}, "yes")
         ]
          //when all promise calls have been completed runs the function
          $.when.apply(null, promises).then(function (json) {
          //converts the string to an object
          json = jsonifyString(json)
          if(json != null){
          //retrieves all elements that match current
                         arr = jsonPath(json, "$..location")
                         console.log (arr)
                         }
                 })
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