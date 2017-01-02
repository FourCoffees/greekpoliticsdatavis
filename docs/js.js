

var MAXTERMS = 17;
var MAXLABELWIDTH = 70;

var margin = {top: 20, right: 20, bottom: 100, left: 80};
var marginSm = {top: 20, right: 20, bottom: 100, left: 20};


var width = $(window).width() - margin.left - margin.right - 30,
    height =  $(window).height() - 2*margin.top - 2*margin.bottom - 20;

var svg;
var data;
var timeScale;
var partyScale;
var PoliticalParties;

var parseDate = d3.timeParse("%d/%m/%Y");
var grid;

$(document).ready(function(){
	
	if( $(window).width() < 768){
		margin = marginSm;
	}
	width = $('#timeline').width() - margin.left - margin.right - 0;
	
	timeScale = d3.scaleLinear().range([0, width]).domain([1,17]);
	partyScale = d3.scalePoint().rangeRound([0, height-10])

	svg = d3.select("#timeline").append("svg")
		.attr('id','mainGraph')
	    .attr("width", width + margin.left + margin.right )
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	d3.json("data.json", function(dataIn) {
	  data = dataIn;
	  //Organise data function
	  organiseData();
	
	  makeLineGraph();
	  makeColorScale();
	});
	
});

function organiseData(){

	data.forEach(function(v){

		//get term as number
		tt = v['Term'].indexOf(' (');
		periodTmp =  ( (v['Term'].substring(0,tt)).trim() )
		period = periodTmp.substring(0, periodTmp.length - 2 )
		v.period = parseInt(period);

		//get term start as date
		dateStartTmp = v['Term'].substring(tt+2, tt + 12);
		// console.log(parseDate(dateStartTmp));
		v.dateTerm = parseDate(dateStartTmp);

	});

	//Get the party names
	var partyGroup = d3.nest() 
		.key(function(d) {return d.Party;}) 
		.key(function(d) {return d.period;}) 
		.entries(data);

	console.log(partyGroup);

	//Get party numbers over the years
	grid = [];
	for(var j=0; j<partyGroup.length; j++){
		grid[j] = [];
		for(var i=0; i<MAXTERMS; i++){

			gg = partyGroup[j].values.filter(function(g){ if( parseInt(g.key) == i){ return true;} });
			if(gg.length >0 ){ grid[j][i] = gg[0].values.length; }
			else{ grid[j][i] = 0; }
		}
	}

	console.log(grid);

	PoliticalParties = d3.values(partyGroup).map(function(d) {
   		 return d.key; 
		});

	partyScale.domain(PoliticalParties);
	// innerPartyScale.domain([])
}

function makeLineGraph(){

	//Line chart values
	x = d3.scaleTime().range([0, width]);
	y = d3.scaleLinear().range([height, 0]);
 	// z = d3.scaleOrdinal(d3.schemeCategory10);


	// Local transformation for graph
	var partyNumbers = d3.nest() 
		.key(function(d) {return d.Party;}) 
		.key(function(d) {return d.dateTerm;}) 
		// .key(function(d) {return d.Description;})
		// .rollup(function(v) { return d3.sum(v, function(d) { return 1; }); })
		.entries(data);

	var electionYears = d3.nest() 
		.key(function(d) {return d.dateTerm;})
		.entries(data);

    electionYears.sort( function(a,b){ return new Date(a.key) - new Date(b.key); });

	partyNumbers.forEach( function(v){
		v.values.sort( function(a,b){ return new Date(a.key) - new Date(b.key); });
		v.values.forEach( function(x){
				x.count = x.values.length;
		});
	})
	
	// Get the range of dates
	x.domain([
	 	new Date(1973,1,1),
	 	// d3.min(partyNumbers, function(c) { return d3.max(c.values, function(d) { return new Date(d.key); }); }),
	    d3.max(partyNumbers, function(c) { return d3.max(c.values, function(d) { return new Date(d.key); }); })
	]);

	//Get the variation of amounts ofpolitians in each party
	y.domain([
		0,
		// 300
	    d3.max(partyNumbers, function(c) { return d3.max(c.values, function(d) { return d.count; }); }) + 10
	]);


	var line = d3.line()
	    .x(function(d) { return x(new Date(d.key) ); })
	    .y(function(d) { return y(d.count); });

	// gridlines in x axis function
	function make_x_gridlines() {		
	    return d3.axisBottom(x)
	    	.ticks( electionYears.length )
	        .tickValues( electionYears.map(function(d) {  return new Date(d.key); }) )
	}

	// gridlines in y axis function
	// Here we make the majority treshold line
	function make_y_gridlines() {		
	    return d3.axisLeft(y)
	    			.tickValues( [151] )
	}

	svg.append("g")
	      .attr("class", "axis axis--x")
	      .attr("transform", "translate(0," + height + ")")
	      .call( d3.axisBottom(x)
	      		.ticks( electionYears.length )
		        .tickValues( 
		        	//Making sure that we get a tick evety election year but that they are at least 1 year appart
		            // for visual purposes
		        	electionYears.map(function(d) {  return new Date(d.key); })
		        		.filter(function(b,i){
			        		if(i>0 && b.getFullYear() - new Date(electionYears[i-1].key).getFullYear() > 1 ){ return true;}
				        	else if(i==0){ console.log(b.getFullYear()); return true;} //show the first date one anyway
			        	})
			    )
		        .tickFormat( d3.timeFormat("%Y") ) 
		        // .tickFormat( d3.timeFormat("%b %Y") ) 
		   );

  	svg.append("g")			
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(make_x_gridlines()
          .tickSize(-height)
          .tickFormat("")
      )

  // add the Y majorityline
  svg.append("g")			
      .attr("class", "majorityline")
      .call(make_y_gridlines()
          .tickSize(-width)
          .tickFormat("")
      )
    .append("text")
   	.attr("y", -6)
   	.attr('text-anchor','start')
    .attr("transform", "translate(6,"+y(151)+")")
	.attr("fill", "#aaa")
	.text("Majority Threshold (151 seats)");


	svg.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y))
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .text("Places in Parliament");


      //Add tooltip
    var tooltip = svg.append('g').attr('class','tooltip');
    	tooltip.append('rect').attr('width','300px').attr('height','5.6em').style('fill','white')
      	tooltip.append('text').attr('y','1.3em').attr('x','0em').attr('class','tooltipYear').attr('text-anchor','end').text('ND')
      	tooltip.append('text').attr('y','4em').attr('x','1em').attr('class','tooltipParty').attr('text-anchor','start').text('2010')
      	tooltip.append('text').attr('y','5.2em').attr('x','1em').attr('class','tooltipPercent').attr('text-anchor','start').text('1% - 3 positions')
      	tooltip.append('svg:image').attr('y','0em').attr('x','1em').attr('class','tooltipImage');



	var party = svg.selectAll(".party")
	    .data(partyNumbers)
	    .enter().append("g")
	      .attr("class", function(d){ return (keys[d.key]) + " party"; });
	
    //  party timeline 
	party.append("path")
		.attr('class',  "partyline")
		.attr("d", function(d) { console.log(d); return line(d.values); })
        .style("stroke", function(d) { 
        	if(extrainfo[d.key].color != "" && d.key!='INDEPENDENT'){ return extrainfo[d.key].color; }
        	else{ return "grey"; }
    	});

    //  party election points 
	circles = [];
	party.each(function(d,v){
		console.log(this);

	    tt = d3.select(this).selectAll("circle.point")
			.data( d.values )
			.enter().append('circle')
			.attr('class', 'point')
			.attr('r',3.5)
			.attr('cy', function(c){ return y(c.count) ;} )
			.attr('cx', function(c){ return x( new Date(c.key)) ;} )
		})


    party.style("fill",function(d){
        	if( extrainfo[d.key].color != ""){ return extrainfo[d.key].color; }
        	else{ return "grey"; }
        });





    //On hover / click
    party.selectAll('.point')
  	        .on("mouseover", function() { 
  	        	thisorgi = d3.select(this).datum();

  	        	//Highlight node
  	        	d3.select(this).style('stroke-width','2px').style('stroke','black');

  	        	//Organise tooltip

  	        	updateTooltip(thisorgi);

  	        	//Show line
  	        	d3.select(this.parentNode).select('.partyline').transition().style('opacity',1).style('display','block')
  	    	})
  	    	.on('mouseup', function(d){

  	    		//If clicked then dont fade out the information
    		  	if( d3.selectAll('.'+keys[d.values[0].Party]).classed('clicked') ==false){
	    	 	  	d3.selectAll('.'+keys[d.values[0].Party]).classed('clicked',true);
    			}else{
					// d3.selectAll('.'+keys[d.values[0].Party]).classed('clicked',false);
    			}
  	    	})
  	        .on("mouseout", function() { 
  	    		
  	    		//If not licked then fade out the information
  	        	if(d3.select(this.parentNode).classed('clicked')==false){
  	       		 	d3.select(this).transition() .duration(2000)
												.style('stroke-width','0')
				
					d3.select('.tooltip').transition().delay(2000).duration(500)
											    .style('opacity',0)
												.on("end", function(){ d3.select(this).style('display','none')}); 

	  	        	d3.select(this.parentNode).select('.partyline').transition()
											    .duration(2000)
											    .style('opacity',0)
												.on("end", function(){ d3.select(this).style('display','none')}); 
				}
  	        })

}

function updateTooltip(thisorgi){
		
		console.log(thisorgi)
		d3.select('.tooltip').style('display','block').style('opacity',1)
    	d3.select('.tooltipYear').text(''+ (new Date(thisorgi.key).getMonth()+1) +"/"+new Date(thisorgi.key).getFullYear() );
    	d3.select('.tooltipParty').text(thisorgi.values[0].Party).call(wrap,280);
    	d3.select('.tooltipPercent').attr('y',function(){
    		return (4 + $('.tooltipParty tspan').length*1.1) +'em';
    	})
    	d3.select('.tooltipPercent').text(+thisorgi.count +' positions gained');

    	d3.select('.tooltipImage').attr("xlink:href",function(d){
    		
    		pa = thisorgi.values[0].Party;
    		im = extrainfo[pa].link;

    		return	"imgs/"+im;
    	})

    	d3.select('.tooltip').attr('transform',function(){
    		//bring tooltip to front
		this.parentNode.appendChild(this);

		//place position next to node
		x = width/2 - 300/2;
		y = 0;
    		return 'translate('+x+","+y+')';

    	}); 
}


function makeColorScale(){

	colorSc = d3.select('#menu-content')
			// .attr('class','legend')

	uniqueClorstmp = Object.keys(extrainfo).map(function (key){ return extrainfo[key]});

	//This is to avoid showing the same color twice for each renaming for example (ANEL and LAEND later on)
	var uniqueClors = d3.nest() 
		.key(function(d) {return d.acronym;}) 
		.entries(uniqueClorstmp);

	colorSc.selectAll('li.cls')
			.data(uniqueClors)
			.enter()
			.append('li').attr('class',function(d){ return 'cls '+ d.values[0].acronym; })

	colorSc.selectAll('li.cls')
		.append('div')
		.attr('class','circle')
		.style('height','16px')
		.style('width','16px')
		.style('border-radius', '100%')
		.style('background-color', function(d){ return d.values[0].color })

	
	colorSc.selectAll('li.cls')
		.append('div')
		.attr('class','labels')
		.html(function(d){ return d.values[0]["greekname"]+ '/'})
	colorSc.selectAll('li.cls')
		.append('div')
		.attr('class','labels')
	.html(function(d){ return d.values[0]["Long Name"]})


    //Add interactions
    colorSc.selectAll('li.cls')
    	.on('mouseover', function(d){

    		// Show the line of the party
    		d3.select('#timeline .'+d.key).select('.partyline').transition().style('opacity',1).style('display','block');
    
    		// Show the individual points of the party (there might be no line)
    		d3.select('#timeline .'+d.key).selectAll('.point').style('stroke-width','2px').style('stroke','black');

    	})
    	.on('mouseout', function(d){

    	   	if( d3.select('.'+d.key).classed('clicked') == false){
	    	   	d3.select('#timeline .'+d.key).selectAll('.point').style('stroke-width','0px').style('stroke','black');

    			d3.select('#timeline .'+d.key).select('.partyline').transition()
    										.duration(500)
										    .style('opacity',0)
											.on("end", function(){ d3.select(this).style('display','none')}); 
    		}
    	})
    	.on('mouseup', function(d){
    	   	
    	   	// d3.select('#timeline .'+d.key).selectAll('.point').style('stroke-width','2px').style('stroke','black');
    
    		// Show the line of the party	
    		if( d3.select('.'+d.key).classed('clicked') == false){
    			d3.select('#timeline .'+d.key).select('.partyline').transition().style('opacity',1).style('display','block');
    
	    		// Show the individual points of the party (there might be no line)
	    		d3.select('#timeline .'+d.key).selectAll('.point').style('stroke-width','2px').style('stroke','black');
  
  	    		d3.select('#timeline .'+d.key).select('.partyline')
										    .style('opacity',1)

				d3.select('#timeline .'+d.key).node().parentNode.appendChild( d3.select('#timeline .'+d.key).node() );

	    		//Show the first point in the tooltip
	    		points = d3.selectAll('#timeline .'+d.key+"  circle.point")._groups[0];

	    		point = points[points.length-1].__data__;
    		
    			updateTooltip(point)
    	  	
	    	  	if( d3.selectAll('.'+d.key).classed('clicked') == false){
		    	   	d3.selectAll('.'+d.key).classed('clicked',true);
	    		}else{
					d3.selectAll('.'+d.key).classed('clicked',false);
	    		}

    		}else{
    	
    		   	d3.select('#timeline .'+d.key).selectAll('.point').style('stroke-width','0px').style('stroke','black');

    			d3.select('#timeline .'+d.key).select('.partyline').transition()
    										.duration(1000)
										    .style('opacity',0)
											.on("end", function(){ d3.select(this).style('display','none')}); 
				if( d3.selectAll('.'+d.key).classed('clicked') == false){
		    	   	d3.selectAll('.'+d.key).classed('clicked',true);
	    		}else{
					d3.selectAll('.'+d.key).classed('clicked',false);
	    		}

    		}


    	});

}


// http://bl.ocks.org/mbostock/7555321
// Wrap text labels
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        xorig = text.attr("x"),
    	dy = 0, // CHANGED
        // dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", xorig).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
       //  Changed the  ++lineNumber * lineHeight TO lineHeight only why increase the line height everytime?
        tspan = text.append("tspan").attr("x",xorig).attr("y", y).attr("dy",++lineNumber*lineHeight + dy + "em").text(word);
      }
    }
  });
}

