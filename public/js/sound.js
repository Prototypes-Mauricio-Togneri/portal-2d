	
	function Sound(name)
	{
		var audio = new Audio('sound/' + name + '.mp3');
		
		this.play = function()
		{
			audio.pause();
			audio.currentTime = 0;
			audio.play();
		}
	}
	
	Sound.PORTAL_BLUE   = new Sound('portal_blue');
	Sound.PORTAL_ORANGE = new Sound('portal_orange');
	Sound.BUTTON_ON     = new Sound('button_on');
	Sound.BUTTON_OFF    = new Sound('button_off');
	Sound.BOX           = new Sound('box');
	Sound.FIZZLER       = new Sound('fizzler');
	Sound.CROSS         = new Sound('cross');
	Sound.DOOR_OPEN     = new Sound('door_open');
	Sound.DOOR_CLOSE    = new Sound('door_close');
	Sound.ERROR         = new Sound('error');
	Sound.SWITCH        = new Sound('switch');