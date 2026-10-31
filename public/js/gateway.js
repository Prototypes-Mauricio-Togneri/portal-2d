
	function Gateway()
	{
		this.blue   = new Portal();
		this.orange = new Portal();
		
		this.clear = function()
		{
			this.blue.clear();
			this.orange.clear();
		}
		
		this.clearPortalAt = function(x, y)
		{
			if (this.blue.isIn(x,y ))
			{
				this.blue.clear();
			}
			
			if (this.orange.isIn(x,y ))
			{
				this.orange.clear();
			}
		}
	}