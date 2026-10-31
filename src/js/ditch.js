	
	function Ditch(data)
	{
		this.id = data.id;
		this.x  = data.x;
		this.y  = data.y;
		this.blocked = (data.hasOwnProperty('blocked')) ? data.blocked : true;
		
		this.isActivated = function()
		{
			return (this.blocked);
		}
		
		this.activate = function()
		{
			if (this.blocked)
			{
				this.blocked = false;
			}
		}
		
		this.deactivate = function()
		{
			if (!this.blocked)
			{
				this.blocked = true;
			}
		}
	}
	
	Ditch.prototype.dark  = '#303030';
	Ditch.prototype.light = '#FFFFFF';