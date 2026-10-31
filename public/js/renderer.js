	
	function Renderer(screenWidth, screenHeight, container)
	{
		this.blockSize = 0;
		
		this.canvas = document.createElement('canvas');
		this.canvas.width             = 0;
		this.canvas.height            = 0;
		this.canvas.style.border      = '1px solid black';
		this.canvas.style.marginLeft  = 'auto';
		this.canvas.style.marginRight = 'auto';
		this.canvas.style.display     = 'block';
		//this.canvas.style.position    = 'relative';
		//this.canvas.style.top         = '50%';
		//this.canvas.style.transform   = 'translateY(-50%)';
		container.appendChild(this.canvas);
		
		this.screen = this.canvas.getContext('2d');
		
		this.setSize = function(width, height)
		{
			var blocksHorizontal = parseInt(screenWidth  / width);
			var blocksVertical   = parseInt(screenHeight / height);
			
			this.blockSize = Math.min(blocksHorizontal, blocksVertical);
			
			this.canvas.width  = this.blockSize * width;
			this.canvas.height = this.blockSize * height;
			
			this.canvas.style.top = ((screenHeight - this.canvas.height) / 2) + 'px';
		}
		
		this.getFinalPosition = function(x, y)
		{
			var result = {};
			result.x   = x * this.blockSize;
			result.y   = this.canvas.height - (y * this.blockSize);
			
			return result;
		}
		
		this.renderBlock = function(x, y, width, height, fillColor, borderColor, borderWidth, opacity)
		{
			if (opacity)
			{
				this.screen.globalAlpha = opacity;
			}
			else
			{
				this.screen.globalAlpha = 1;
			}
			
			if (borderWidth)
			{
				this.screen.fillStyle = borderColor;
				this.screen.fillRect(x, y - height, width, height);
			}
			
			this.screen.fillStyle = fillColor;
			this.screen.fillRect(x + borderWidth, y - height + borderWidth, width - (borderWidth * 2), height - (borderWidth * 2));
		}
		
		this.drawLine = function(direction, x, y, width, height, fillColor, borderColor, borderWidth, opacity, widthRatio)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			if (direction == "H")
			{
				var finalHeight = width / widthRatio;
				this.renderBlock(finalPosition.x, finalPosition.y  - (height / 2) + (finalHeight / 2), width, finalHeight, fillColor, borderColor, borderWidth, opacity);
			}
			else if (direction == "V")
			{
				var finalWidth = width / widthRatio;
				this.renderBlock(finalPosition.x + (width / 2) - (finalWidth / 2), finalPosition.y, finalWidth, height, fillColor, borderColor, borderWidth, opacity);
			}
		}
		
		this.drawBlock = function(x, y, width, height, fillColor, borderColor, borderWidth, opacity)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x, finalPosition.y, width, height, fillColor, borderColor, borderWidth, opacity);
		}
		
		this.drawMiniBlock = function(x, y, width, height, fillColor, borderColor, borderWidth, opacity)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x + (width / 4), finalPosition.y - (height / 4), width / 2, height / 2, fillColor, borderColor, borderWidth, opacity);
		}
		
		this.drawBlockLeft = function(x, y, width, height, fillColor, borderColor, borderWidth)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x, finalPosition.y, width / 2, height, fillColor, borderColor, borderWidth);
		}
		
		this.drawBlockRight = function(x, y, width, height, fillColor, borderColor, borderWidth)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x + (width / 2), finalPosition.y, width / 2, height, fillColor, borderColor, borderWidth);
		}
		
		this.drawBlockUp = function(x, y, width, height, fillColor, borderColor, borderWidth)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x, finalPosition.y - (height / 2), width, height / 2, fillColor, borderColor, borderWidth);
		}
		
		this.drawBlockDown = function(x, y, width, height, fillColor, borderColor, borderWidth)
		{
			var finalPosition = this.getFinalPosition(x, y);
			
			this.renderBlock(finalPosition.x, finalPosition.y, width, height / 2, fillColor, borderColor, borderWidth);
		}
		
		this.drawTriangle = function(x1, y1, x2, y2, x3, y3, color)
		{
			this.screen.beginPath();
			this.screen.fillStyle = color;
			this.screen.moveTo(x1, y1);
			this.screen.lineTo(x2, y2);
			this.screen.lineTo(x3, y3);
			this.screen.fill();
		}
		
		this.drawTriangleUp = function(x, y, color)
		{
			var center = this.getTriangleCenter(x, y);
			
			this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y + center.size, center.x, center.y - center.size, color);
		}
		
		this.drawTriangleDown = function(x, y, color)
		{
			var center = this.getTriangleCenter(x, y);
			
			this.drawTriangle(center.x - center.size, center.y - center.size, center.x + center.size, center.y - center.size, center.x, center.y + center.size, color);
		}
		
		this.drawTriangleLeft = function(x, y, color)
		{
			var center = this.getTriangleCenter(x, y);
			
			this.drawTriangle(center.x + center.size, center.y + center.size, center.x - center.size, center.y, center.x + center.size, center.y - center.size, color);
		}
		
		this.drawTriangleRight = function(x, y, color)
		{
			var center = this.getTriangleCenter(x, y);
			
			this.drawTriangle(center.x - center.size, center.y + center.size, center.x + center.size, center.y, center.x - center.size, center.y - center.size, color);
		}
		
		this.getTriangleCenter = function(x, y)
		{
			var centerX = (x * this.blockSize) + (this.blockSize / 2);
			var centerY = this.canvas.height - (y * this.blockSize) - (this.blockSize / 2);
			var half    = (this.blockSize / 2) * 0.4;
			
			var result =
			{
				x: centerX,
				y: centerY,
				size: half
			};
			
			return result;
		}
		
		this.drawPortal = function(portal, fillColor, borderColor, borderWidth)
		{
			switch (portal.direction)
			{
				case Direction.UP:
					this.drawBlockUp(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth);
					break;
					
				case Direction.DOWN:
					this.drawBlockDown(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth);
					break;
					
				case Direction.LEFT:
					this.drawBlockLeft(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth);
					break;
					
				case Direction.RIGHT:
					this.drawBlockRight(portal.x, portal.y, this.blockSize, this.blockSize, fillColor, borderColor, borderWidth);
					break;
			}
		}
		
		this.drawExit = function(exit)
		{
			this.drawBlock(exit.x, exit.y, this.blockSize, this.blockSize, exit.fillColor, exit.borderColor, exit.borderWidth);
		}
		
		this.drawDoor = function(door)
		{
			this.drawBlock(door.x, door.y, this.blockSize, this.blockSize, door.fillColor, door.borderColor, door.borderWidth);
		}
		
		this.drawFizzler = function(fizzler)
		{
			this.drawBlock(fizzler.x, fizzler.y, this.blockSize, this.blockSize, fizzler.fillColor, fizzler.borderColor, fizzler.borderWidth, 0.5);
		}
		
		this.drawBarrier = function(barrier)
		{
			//this.drawBlock(barrier.x, barrier.y, this.blockSize, this.blockSize, barrier.fillColor, barrier.borderColor, barrier.borderWidth);
			
			var finalPosition = this.getFinalPosition(barrier.x, barrier.y);
			
			var x = finalPosition.x + (this.blockSize / 2);
			var y = finalPosition.y - this.blockSize + (this.blockSize / 2);
			
			var gradient = this.screen.createRadialGradient(x, y, 0, x, y, this.blockSize);
			gradient.addColorStop(0, barrier.dark);
			gradient.addColorStop(1, barrier.light);
			
			this.renderBlock(finalPosition.x, finalPosition.y, this.blockSize, this.blockSize, gradient, 0, 0);
		}
		
		this.drawDitch = function(ditch)
		{
			/*var finalPosition = this.getFinalPosition(ditch.x, ditch.y);
			
			var y = finalPosition.y - this.blockSize - 15;
			
			var gradient = this.screen.createLinearGradient(finalPosition.x, y, finalPosition.x, y + this.blockSize);
			gradient.addColorStop(0, ditch.light);
			gradient.addColorStop(1, ditch.dark);
			
			this.renderBlock(finalPosition.x, finalPosition.y, this.blockSize, this.blockSize, gradient, 0, 0);*/
			
			this.drawBlock(ditch.x, ditch.y, this.blockSize, this.blockSize, ditch.dark, 0, 0);
		}
		
		this.drawLaser = function(laser)
		{
			this.drawLine(laser.direction, laser.x, laser.y, this.blockSize, this.blockSize, laser.fillColor, laser.borderColor, laser.borderWidth, 1, laser.widthRatio);
		}
		
		this.drawWall = function(wall)
		{
			this.drawBlock(wall.x, wall.y, this.blockSize, this.blockSize, wall.fillColor, wall.borderColor, wall.borderWidth);
		}
		
		this.drawFloor = function(x, y)
		{
			this.drawBlock(x, y, this.blockSize, this.blockSize, Floor.fillColor, Floor.borderColor, Floor.borderWidth);
		}
		
		this.drawArrows = function(arrows)
		{
			for (var i = 0; i < arrows.length; i++)
			{
				var arrow = arrows[i];
				
				switch (arrow.direction)
				{
					case Direction.UP:
						this.drawTriangleUp(arrow.x, arrow.y, arrow.fillColor);
						break;
						
					case Direction.DOWN:
						this.drawTriangleDown(arrow.x, arrow.y, arrow.fillColor);
						break;
						
					case Direction.LEFT:
						this.drawTriangleLeft(arrow.x, arrow.y, arrow.fillColor);
						break;
						
					case Direction.RIGHT:
						this.drawTriangleRight(arrow.x, arrow.y, arrow.fillColor);
						break;
				}
			}
		}
		
		this.drawBoxes = function(boxes, chamber)
		{
			for (var i = 0; i < boxes.length; i++)
			{
				var box = boxes[i];
				
				var button = chamber.getButton(box.x, box.y);
				
				if (button)
				{
					this.drawMiniBlock(box.x, box.y, this.blockSize, this.blockSize, box.fillColor, box.borderColor, box.borderWidth);
				}
				else
				{
					this.drawBlock(box.x, box.y, this.blockSize, this.blockSize, box.fillColor, box.borderColor, box.borderWidth);
				}
			}
		}
		
		this.drawButtons = function(buttons)
		{
			for (var i = 0; i < buttons.length; i++)
			{
				var button = buttons[i];
				this.drawBlock(button.x, button.y, this.blockSize, this.blockSize, button.fillColor, button.borderColor, button.borderWidth);
			}
		}
		
		this.drawSwitches = function(switches)
		{
			for (var i = 0; i < switches.length; i++)
			{
				var switchElement = switches[i];
				this.drawBlock(switchElement.x, switchElement.y, this.blockSize, this.blockSize, switchElement.fillColor, switchElement.borderColor, switchElement.borderWidth);
			}
		}
		
		this.drawSubject = function(subject)
		{
			this.drawBlock(subject.x, subject.y, this.blockSize, this.blockSize, subject.fillColor, subject.borderColor, subject.borderWidth);
			
			var triangleColor = subject.arrowColor;
			
			if (subject.hasBox())
			{
				triangleColor = Box.prototype.fillColor;
			}
			
			switch (subject.direction)
			{
				case Direction.UP:
					this.drawTriangleUp(subject.x, subject.y, triangleColor);
					break;
					
				case Direction.DOWN:
					this.drawTriangleDown(subject.x, subject.y, triangleColor);
					break;
					
				case Direction.LEFT:
					this.drawTriangleLeft(subject.x, subject.y, triangleColor);
					break;
					
				case Direction.RIGHT:
					this.drawTriangleRight(subject.x, subject.y, triangleColor);
					break;
			}
		}
		
		this.render = function(state)
		{			
			this.screen.fillStyle = '#202020';
			this.screen.fillRect(0, 0, this.canvas.width, this.canvas.height);
			
			var chamber  = state.chamber;
			var subject  = state.subject;
			var gateway  = state.gateway;
			var barriers = chamber.barriers;
			var boxes    = chamber.boxes;
			var buttons  = chamber.buttons;
			var ditches  = chamber.ditches;
			var switches = chamber.switches;
			var arrows   = chamber.arrows;
			var lasers   = chamber.lasers;
			var fizzlers = chamber.fizzlers;
			var doors    = chamber.doors;
			var exit     = chamber.exit;
			
			if (chamber)
			{
				var floor = chamber.floor;
				
				for (var x = 0; x < chamber.width; x++)
				{
					for (var y = 0; y < chamber.height; y++)
					{
						this.drawFloor(x, y);
					}
				}
				
				//---------------------------------------------
				
				if (arrows)
				{
					this.drawArrows(arrows);
				}
				
				//---------------------------------------------
				
				var walls = chamber.walls;
				
				for (var i = 0; i < walls.length; i++)
				{
					this.drawWall(walls[i]);
				}
				
				//---------------------------------------------
				
				if (barriers)
				{
					for (var i = 0; i < barriers.length; i++)
					{
						var barrier = barriers[i];
						
						if (barrier.isActivated())
						{
							this.drawBarrier(barrier);
						}
					}
				}
				
				//---------------------------------------------
				
				if (ditches)
				{
					for (var i = 0; i < ditches.length; i++)
					{
						var ditch = ditches[i];
						
						if (ditch.isActivated())
						{
							this.drawDitch(ditch);
						}
					}
				}
				
				//---------------------------------------------
				
				if (lasers)
				{
					for (var i = 0; i < lasers.length; i++)
					{
						var laser = lasers[i];
						
						if (laser.isActivated())
						{
							this.drawLaser(laser);
						}
					}
				}
				
				//---------------------------------------------
				
				if (doors)
				{
					for (var i = 0; i < doors.length; i++)
					{
						var door = doors[i];
						
						if (door.isActivated())
						{
							this.drawDoor(door);
						}
					}
				}
				
				//---------------------------------------------
				
				if ((exit) && (exit.isActivated()))
				{
					this.drawExit(exit);
				}
			}
			
			if (gateway)
			{
				if (gateway.blue.isActivated())
				{
					this.drawPortal(gateway.blue, Portal.BLUE.fillColor, Portal.BLUE.borderColor, Portal.BLUE.borderWidth);
				}
				
				if (gateway.orange.isActivated())
				{
					this.drawPortal(gateway.orange, Portal.ORANGE.fillColor, Portal.ORANGE.borderColor, Portal.ORANGE.borderWidth);
				}
			}
			
			if (buttons)
			{
				this.drawButtons(buttons);
			}
			
			if (switches)
			{
				this.drawSwitches(switches);
			}
			
			if (boxes)
			{
				this.drawBoxes(boxes, chamber);
			}	
			
			if (subject)
			{
				this.drawSubject(subject);
			}
			
			if (fizzlers)
			{
				for (var i = 0; i < fizzlers.length; i++)
				{
					var fizzler = fizzlers[i];
					
					if (fizzler.isActivated())
					{
						this.drawFizzler(fizzler);
					}
				}
			}
		}
	}