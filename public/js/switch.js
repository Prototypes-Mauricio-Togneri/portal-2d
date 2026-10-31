	
	function Switch(data, chamber)
	{
		this.x  = data.x;
		this.y  = data.y;
		this.links   = data.links;
		this.chamber = chamber;
		
		this.activate = function()
		{
			Sound.SWITCH.play();
			this.chamber.activate(this.links);
		}
	}
	
	Switch.prototype.fillColor   = '#F27A22';
	Switch.prototype.borderColor = '#B52A2A';
	Switch.prototype.borderWidth = 0.1;