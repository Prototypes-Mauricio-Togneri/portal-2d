	
	function Box(data)
	{
		this.id = data.id;
		this.x  = data.x;
		this.y  = data.y;
		
		this.reset = function()
		{
			this.x  = data.x;
			this.y  = data.y;
		}
		
		this.activate = function()
		{
			this.reset();
		}
	}
	
	Box.prototype.fillColor   = '#BE785A';
	Box.prototype.borderColor = '#8F5B45';
	Box.prototype.borderWidth = 0.1;