	
	function Button(data, chamber)
	{
		this.x  = data.x;
		this.y  = data.y;
		this.links   = data.links;
		this.chamber = chamber;
		this.activated = false;
		
		this.activate = function()
		{
			if (!this.activated)
			{
				this.activated = true;
				Sound.BUTTON_ON.play();
				this.chamber.activate(this.links);
				
				return true;
			}
			
			return false;
		}
		
		this.deactivate = function()
		{
			if (this.activated)
			{
				this.activated = false;
				Sound.BUTTON_OFF.play();
				this.chamber.deactivate(this.links);
				
				return true;
			}
			
			return false;
		}
		
		this.isIn = function(x, y)
		{
			return (this.x == x) && (this.y == y);
		}
	}
	
	Button.prototype.fillColor   = '#DC3C32';
	Button.prototype.borderColor = '#BA332B';
	Button.prototype.borderWidth = 0.1;