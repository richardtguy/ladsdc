// Initialise page
$(document).ready(function(){
	// Refresh balance, order and stock prices
	refresh();
	$("#btn-refresh").on("click", refresh);
	$("#userAccount").html(account);
	// API call to get list of stocks traded on exchange
	fetch("/api/stocks")
		.then(response => response.json())
		.then(data => {
			var options = document.getElementById("stockOptions");
			$.each(data.stocks, function(){
				var o = document.createElement("option");
				options.appendChild(o).innerHTML = this;
			})
		});
})

// Refresh data on page
function refresh(){
	document.getElementById("status").classList.toggle("fa-spinner")
	Promise.all([
		refreshOrders,
		refreshBalance,
		refreshPrices,
		refreshChart
	])
	.then(() => {
		document.getElementById("status").classList.toggle("fa-spinner");
	});
}


// API call to cancel order by id
function cancelOrder(id){
	fetch('/api/orders/'+id, {
		method: 'delete'
	})
		.then(data => refresh());
}

// API call to get list of orders for account and write to table
const refreshOrders = fetch("/api/orders/"+account)
	.then(response => response.json())
	.then(data => {
		var orders = data;				
		var table = document.getElementById("orderTableBody");
		for(var i = table.rows.length - 1; i > -1; i--) {
			table.deleteRow(i);
		}
		$.each(orders, function(){
			var row = table.insertRow(-1);
			var time = new Date(this.timestamp).toLocaleTimeString('en-GB', {
				hour: '2-digit',
				minute: '2-digit'
			});
			row.insertCell().innerHTML = time;
			row.insertCell().innerHTML = this.stock;
			row.insertCell().innerHTML = this.side;							
			row.insertCell().innerHTML = this.volume;
			row.insertCell().innerHTML = this.limit;
			var btn = document.createElement("BUTTON");
			btn.classList.add("btn", "btn-primary", "float-right");
			btn.setAttribute("type", "button");
			btn.id = this.id
			var t = document.createTextNode("Cancel order");
			btn.appendChild(t);
			row.insertCell().appendChild(btn);
			btn.onclick = function(){
				cancelOrder(this.id);
		}});
	})

// API call to get latest bid/ask prices for each stock and write to table
const refreshPrices = fetch("/api/prices")
	.then(response => response.json())
	.then(data => {
		var table = document.getElementById("priceTableBody");
		for(var i = table.rows.length - 1; i > -1; i--) {
			table.deleteRow(i);
		}
		$.each(data, function(){
			var row = table.insertRow(-1);
			row.insertCell().innerHTML = this.stock;
			row.insertCell().innerHTML = this.best_bid;
			row.insertCell().innerHTML = this.best_ask;
			row.insertCell().innerHTML = this.last;						
	})
})

// API call to get latest balance and write to page
const refreshBalance = fetch("/api/accounts/"+account)
	.then(function(response) {
		if(response.ok) {
			return response.json();
		}
		// If account not found, call API to create new account
		fetch('/api/accounts', {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({'name': account})
		})
		.then(response => response.json())
		.then(data => {
			// Display welcome message
			alert("Welcome to CatanEX, "+data.response.name+"! Your opening balance: $"+data.response.balance);
			$("#balance").html(data.response.balance);
		});
	})
	.then(data => {
		$("#balance").html(data.balance)
	})

// Define colour palette
const palette = ['#396AB1', '#DA7C30', '#3E9651', '#CC2529', '#535154', '#6B4C9A', '#922428', '#948B3D']

// Refresh chart
const refreshChart = fetch("/api/trades")
	.then(function(response) {
		return response.json();
	})
	.then(function(data){
		var datasets = []
		$.each(data, function(index){
			points = []
			$.each(this.data, function(){
				points.push({x:new Date(this.timestamp), y:this.price});
			})
			points.sort((a, b) => a.x - b.x);
			datasets.push({label:this.stock, fill:false, borderColor: palette[index], data:points});
		})
		var ctx = document.getElementById("stockChart").getContext('2d');
		var stockChart = new Chart(ctx, {
				type: 'line',
				data: {
						datasets: datasets
				},
				options: {
						elements: {
							line: {
									tension: 0, // disables bezier curves
							}
						},
						scales: {
								xAxes: [{
										type: 'time',
										time: {
											unit: 'minute',
											displayFormats: {
												hour: 'hh:mm a'
											},
										},
										position: 'bottom'
								}]
						}
				}
		});
	})

// Get inputs from form and submit API call to create new order
$("form").submit(function(event) {
	event.preventDefault();
	var orderData = {
		'account':	account,
		'stock':		$("#stockOptions").val(),
		'type':			'limit',
		'side':			$("input[type='radio'][name='side']:checked").val(),
		'volume':		parseInt($("#inputVolume").val()),
		'limit':		Number($("#inputLimit").val())				
	};
	fetch('/api/orders', {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(orderData)
	})
		.then(data => refresh());
	$("#orderModal").modal("hide");
});

// Connect websocket
console.log("Connecting via websocket...");
var stream = new ReconnectingWebSocket('ws://' + location.host + "/stream");
// called when a message arrives
stream.onmessage = function(message) {
	console.log("Received message: " + message.data);
	alert(message.data);
};
stream.onopen = function() {
	document.getElementById("status").setAttribute("style", "color:black;")
	console.log("Websocket opened");
};
stream.onclose = function(event) {
	document.getElementById("status").setAttribute("style", "color:lightgray;")
  console.log("Websocket connection closed: "+JSON.stringify(event));
};