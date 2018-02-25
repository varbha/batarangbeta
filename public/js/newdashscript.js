$.ajax({
    url: 'http://localhost:9000/user',
    type: 'POST',
    data:{
        "url": window.location.href
    },
    dataType:'json',
    success: function(data){
        //document.getElementById("details").innerHTML = JSON.stringify(data[0]);
        //console.log(data[0]);
        $.ajax({
            url:'/getRooms',
            type:'post',
            success: function(rdata){
                console.log("rdata", rdata);
                
                document.getElementById("username").innerHTML = JSON.stringify(data[0]['user']);
                document.getElementById("mail").innerHTML = JSON.stringify(data[0]['emailid']);
                var u = (window.location.href).indexOf('=');
                var username = (window.location.href).substr(u+1);
                console.log(data[0]['rooms'].length);

                for(var i =0;i<data[0]['rooms'].length;i++){
                    var l = document.createElement("li");
                    l.setAttribute('class','list-group-item');
                    var a = document.createElement("a");
                    var kbd = document.createElement('kbd');
                    kbd.setAttribute('id','roomm');
                    var ulist = document.getElementById("roomList");
                    kbd.textContent = ("Room "+ data[0]['rooms'][i]);
                    
                    var dynamicLink='http://localhost:9000/edit/?user='+username+'&room='+data[0]['rooms'][i];

                    a.setAttribute('href', dynamicLink);
                    a.appendChild(kbd);
                    l.appendChild(a);
                   
                    


                for(var k =0;k< rdata.length;k++){
                    //console.log("RDATA: " +rdata[k]['roomNo']);
                    //console.log("DATA0: "+data[0]['rooms'][i]);
                    //console.log(rdata[k]['roomNo'] == data[0]['rooms'][i]);
                    if (rdata[k]['roomNo'] == data[0]['rooms'][i]){
                        //console.log("ENTERED IF");
                        // var l2 = document.createElement("li");
                        // var a2 = document.createElement("a");
                        // var ulist = document.getElementById("roomList");
                        //console.log("DATA IN IF FOR K= " + k +" IS "+ rdata[k]['lastModifiedBy']);
                        var kbd = document.createElement('kbd');
                        kbd.setAttribute('id','lastmodifiedby');
                        kbd.setAttribute('data-toggle','tooltip');
                        kbd.setAttribute('title','User that last edited the code');
                        if (rdata[k]['lastModifiedBy'] != ""){
                        kbd.textContent = rdata[k]['lastModifiedBy'];
                        l.appendChild(kbd);
                        }
                    }
                }
                ulist.appendChild(l);

            }

            showRoomList(rdata);
        }
        });

    },
    async:true

});


var refreshOnChange = function(){

    $.ajax({
    url: 'http://localhost:9000/user',
    type: 'POST',
    data:{
        "url": window.location.href
    },
    dataType:'json',
    success: function(data){
        //document.getElementById("details").innerHTML = JSON.stringify(data[0]);
        //console.log(data[0]);
        $.ajax({
            url:'/getRooms',
            type:'post',
            success: function(rdata){
                document.getElementById("username").innerHTML = JSON.stringify(data[0]['user']);
                document.getElementById("mail").innerHTML = JSON.stringify(data[0]['emailid']);
                var u = (window.location.href).indexOf('=');
                var username = (window.location.href).substr(u+1);
                $("#roomList").empty();
                console.log(data[0]['rooms'].length);

                for(var i =0;i<data[0]['rooms'].length;i++){
                    var l = document.createElement("li");
                    
                    l.setAttribute('class','list-group-item');
                    var a = document.createElement("a");
                    var kbd = document.createElement('kbd');
                    kbd.setAttribute('id','roomm');
                    var ulist = document.getElementById("roomList");
                    kbd.textContent = ("Room "+ data[0]['rooms'][i]);
                    var dynamicLink='http://localhost:9000/edit/?user='+username+'&room='+data[0]['rooms'][i];

                    a.setAttribute('href', dynamicLink);
                    a.appendChild(kbd);
                    l.appendChild(a);
                    
                for(var k =0;k< rdata.length;k++){
                   //console.log("RDATA: " +rdata[k]['roomNo']);
                    //console.log("DATA0: "+data[0]['rooms'][i]);
                    //console.log(rdata[k]['roomNo'] == data[0]['rooms'][i]);
                    if (rdata[k]['roomNo'] == data[0]['rooms'][i]){
                        //console.log("ENTERED IF");
                        // var l2 = document.createElement("li");
                        // var a2 = document.createElement("a");
                        // var ulist = document.getElementById("roomList");
                        //console.log("DATA IN IF FOR K= " + k +" IS "+ rdata[k]['lastModifiedBy']);
                        var kbd = document.createElement('kbd');
                        kbd.setAttribute('id','lastmodifiedby');
                        kbd.setAttribute('data-toggle','tooltip');
                        kbd.setAttribute('title','User that last edited the code');
                        kbd.textContent = rdata[k]['lastModifiedBy'];
                        l.appendChild(kbd);
                    }
                }
                ulist.appendChild(l);

            }
            showRoomList(rdata);
        }
        });

    },
    async:true

});

}

//---------------------------------------------------------------------------------------------

var showRoomList = function(data){
    console.log("SRL: ",data);
    console.log("SRL: ",data.length);
    var u = document.getElementById("roomListing");
    $("#roomListing").empty();
    for(let i = 0;i<data.length;i++){
        //console.log(data[i]);
        //console.log(data[i]['roomNo']);
        //console.log(data[i]['roomDesc']);

        if(data[i]['access']!='private'){
        var l = document.createElement("li");
        var p = document.createElement("p");
        var ulist = document.getElementById("roomListing");
        p.textContent = ("Room "+ data[i]['roomNo'] + "\n Room description: " + data[i]['roomDesc']);
        l.appendChild(p);
        u.appendChild(l);
    }


    }
}
//-----------------------------------------------------------------------------------
var u = (window.location.href).indexOf('=');
        var username = (window.location.href).substr(u+1);
        document.getElementById("welcome").innerHTML = "Welcome, " + username;

        //-----------------------------------------------------------

        function createRoom(){
            var room = document.getElementById("roomNumber").value;
            var url = window.location.href;
            var roomDesc = document.getElementById("roomDesc").value;
            let access = document.getElementById("access").value.trim();
            /*console.log(access=="public");*/
            if(room!="" && access!="" && (access =="public" || access=="private")) {
            $.ajax({
                url:'http://localhost:9000/testCreateRoom',
                type:'POST',
                data:{
                    "url":url,
                    "room":room,
                    "roomDesc": roomDesc,
                    "access" : access
                },
                dataType:"json",
                success: function(data){
                    console.log(data);
                    alert(data['reply']);
                    document.getElementById("roomNumber").value = '';
                    document.getElementById("roomDesc").value = '';
                    document.getElementById("access").value = '';

                    refreshOnChange();


                }
            });
        }
        else{
            alert("INPUT A VALUE/ ENTER CORRECT VALUE");
        }
        }

        function joinRoom(){
            var reqRoom = document.getElementById("joiningRoom").value;
            //VERY IMP: FIRST CHECK IF ALREADY PART OF ROOM
            let flag = true;
             $.ajax({
            url: 'http://localhost:9000/user',
            type: 'POST',
            data:{
                "url": window.location.href
            },
            dataType:'json',
            success: function(data){
                for(let i =0;i< data[0]['rooms'].length;i++){
                    if (reqRoom == data[0]['rooms'][i]){
                        flag =false;
                        alert("YOU GOT THIS ROOM");
                        document.getElementById("joiningRoom").value = '';
                        break;
                    }
                }

            if(flag){
            var url = window.location.href;
            var name = url.indexOf('=');
            var n = url.substr(name+1);

            $.ajax({
                url:'testJoinRoom',
                type:'POST',
                data:{
                    'room': reqRoom,
                    'username' : n
                },
                dataType:'json',
                success: (data) =>{
                console.log(data);
                if(data['reply']=="UPDATED"){
                    alert("JOIN SUCCESSFUL");
                    document.getElementById("joiningRoom").value = '';
                    refreshOnChange();
                }
                else {
                    alert("INVALID! CANNOT JOIN");
                    document.getElementById("joiningRoom").value ='';
                }
            }
            });
        }
        }
    });
         }

         function exitRoom(){

            var url = window.location.href;
            var name = url.indexOf('=');
            var user = url.substr(name+1);
            var roomToExit = document.getElementById("exitingRoom").value;
            console.log(roomToExit);
            console.log(user);
            $.ajax({
                url:'/user',
                type: 'post',
                data:{
                "url": window.location.href
                    },
                dataType:'json',
                success : function(data){
                    var rooms = data[0]['rooms'];
                    let flag = true;
                    for(let i =0;i< data[0]['rooms'].length;i++){
                    if (roomToExit == data[0]['rooms'][i]){
                        flag =false;
                        break;

                    }
                }
                    if(flag == true){
                        document.getElementById("exitingRoom").value = '';
                        alert("INVALID ROOM SELECTED");

                    }
                    else if(flag == false){
                        $.ajax({
                            url:'/exitRoom',
                            type:'post',
                            data: {
                                'user' : user,
                                'roomNo' : roomToExit
                            },
                            dataType:'json',
                            success: function(data){
                                if(data['success'] == true){
                                    alert("EXIT SUCCESSFUL");
                                    refreshOnChange();
                                    document.getElementById("exitingRoom").value ='';
                                }
                            }
                        });
                    }
                }
            });

         }