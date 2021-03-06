'use strict';
var board = [];
var side = 0;
var pieceName = ['帥', '仕', '相', '俥', '馬', '砲', '兵', '將', '士', '象', '車', '馬', '炮', '卒'];
var health = [30, 10, 5, 5, 5, 5, 2];
var prev_selected = [];
var dead_count = [];
var born_count = [];
var move_stack = [];
var cur_move_id;
var state;
var peace_round = [];
var init_rate;
var start_double;
var kill_stack = [];


// 0: beginned 1: one piece picked 2: one covered piece picked 
// 3: cannon attack covered piece 
// 4: red win 5: black win 6: draw
function Move(from, to, capture) {
	this.from = from;
	this.to = to;
	this.capture =capture;
}

function Kill(first, black, redmax, blackmax) {
	if (first instanceof Kill) {
		this.red = first.red;
		this.black = first.black;
		this.redmax = first.redmax;
		this.blackmax = first.blackmax;
	} else {
		this.red = first;
		this.black = black;
		this.redmax = redmax;
		this.blackmax = blackmax;
	}
}

window.onload = function() {
	init();
	restart();
}

function init() {
	var svg = document.getElementById('bgimg');
	var chosenpanel = document.getElementById('chosenpanel');
	var vertical = [];
	var horizonal = [];
	for (var i = 0; i < 5; i++) {
		vertical[i] = 14.5 + 57 * i;
	}
	for (var i = 0; i < 9; i++) {
		horizonal[i] = 14.5 + 57 * i;
	}
	for (var i = 0; i < 3; i++) {
		var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		svg.appendChild(line);
		line.setAttribute('x1', vertical[i+1].toString());
		line.setAttribute('y1', horizonal[0].toString());
		line.setAttribute('x2', vertical[i+1].toString());
		line.setAttribute('y2', horizonal[8].toString());
	}
	for (var i = 0; i < 7; i++) {
		var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		svg.appendChild(line);
		line.setAttribute('x1', vertical[0].toString());
		line.setAttribute('y1', horizonal[i+1].toString());
		line.setAttribute('x2', vertical[4].toString());
		line.setAttribute('y2', horizonal[i+1].toString());
	}

	for (var i = 0; i < 4; i++) {
		board[i] = [];
		for (var j = 0; j < 8; j++) {
			board[i][j] = document.createElement('div');
			board[i][j].setAttribute('class', 'piece covered');
			board[i][j].setAttribute('val', 1);
			board[i][j].setAttribute('pos', String.fromCharCode('A'.charCodeAt(0)+j)+i);
			board[i][j].onclick = function() {
				if (state >= 4) return;
				var val = this.getAttribute('val');
				if (state == 0) {
					if (val !== '0') {
						if (val !== '1' && (val >>> 3 !== side + 1)) return;
						prev_selected[0] = this;
						this.setAttribute('class', this.getAttribute('class') + ' selected');
						if (val === '1') {
							state = 2;
							chosenpanel.style.display = 'block';
						} else {
							state = 1;
						}
					}
					return;
				}
				if (state === 1) {
					if (val === '1') {
						if (+prev_selected[0].getAttribute('val') % 8 === 5) {
							chosenpanel.style.display = 'block';
							prev_selected[1] = this;
							state = 3;
						} else {
							prev_selected[0].setAttribute('class', prev_selected[0].getAttribute('class').replace(' selected', ''));
							state = 0;
						}
						return;
					}
					var move = new Move(prev_selected[0].getAttribute('pos'), this.getAttribute('pos'), +val);
					prev_selected[0].setAttribute('class', prev_selected[0].getAttribute('class').replace(' selected', ''));
					updateMove(move);
					if (state < 4) state = 0;
					return;
				}
				// state === 2 || state === 3
				prev_selected[0].setAttribute('class', prev_selected[0].getAttribute('class').replace(' selected', ''));
				if (state < 4) state = 0;
			};
		}
	}
	var container = document.getElementById('container');
	for (var j = 0; j < 8; j++) {
		var row = document.createElement('div');
		row.setAttribute('class', 'bdrow');
		container.appendChild(row);
		for (var i = 0; i < 4; i++) {
			row.appendChild(board[i][j]);
		}
	}
	document.getElementById('flipchess').onmouseleave = function() {
		if (state >= 4) return;
		if (prev_selected[0] != undefined) {
			prev_selected[0].setAttribute('class', prev_selected[0].getAttribute('class').replace(' selected', ''));
		}
		chosenpanel.style.display = '';
		state = 0;
	}
	var spieces = chosenpanel.getElementsByClassName('smallpiece');
	for (var i = 0; i < spieces.length; i++) {
		spieces[i].onclick = function() {
			chosenpanel.style.display = '';
			if (state < 1 || state > 3) return;
			var move;
			if (state === 2) {
				move = new Move(undefined,
					prev_selected[0].getAttribute('pos'),
					{isCovered: true, piece: + this.getAttribute('val')}
				);
			} else {
				move = new Move(
					prev_selected[0].getAttribute('pos'),
					prev_selected[1].getAttribute('pos'),
					{isCovered: true, piece: +this.getAttribute('val')}
				);
			}
			prev_selected[0].setAttribute('class', prev_selected[0].getAttribute('class').replace(' selected', ''));
			updateMove(move);
			if (state <= 3) state = 0;
		}
	}
	document.getElementById('selMoveList').onclick = function() {
		if (state > 3) {
			var target = this.selectedIndex;
			if (target < cur_move_id) {
				while (cur_move_id !== target) {
					unmakeMove(move_stack[--cur_move_id]);
				}
			} else {
				while (cur_move_id !== target) {
					makeMove(move_stack[cur_move_id++]);
				}
			}
		}
	};
}

function modifyHP(hpval, _side_, inc) {
	if (typeof _side_ !== typeof true)
		_side_ = _side_ == undefined || _side_ != 'blue';
	var text = document.getElementsByClassName('progress-bar-text-val');
	text = _side_ ? text[0] : text[1];
	if (inc)
		hpval = +text.firstChild.innerHTML + hpval;
	text.firstChild.innerHTML = hpval;
	if (hpval < 0)
		hpval = 0;
	var percentage = Math.round(hpval * 100 / 60) + '%';
	var bar = document.getElementById(_side_ ? 'red-bar' : 'blue-bar');
	bar.style.width = percentage;
}

function restart_silence() {
	for (var i = 0; i < 4; i++) {
		for (var j = 0; j < 8; j++) {
			board[i][j].setAttribute('class', 'piece covered');
			board[i][j].setAttribute('val', 1);
			board[i][j].innerHTML = '';
		}
	}
	state = 0;
	side = 1;
	changeSide();
	for (var i = 0; i < 14; i++) {
		dead_count[i] = 0;
	}
	born_count = [1, 2, 2, 2, 2, 2, 5, 1, 2, 2, 2, 2, 2, 5];
	move_stack = [];
	modifyHP(60, 'red');
	modifyHP(60, 'blue');
	var born_sp = document.getElementById('chosenpanel').getElementsByClassName('smallpiece');
	for (var i = 0; i < 14; i++) {
		var text = born_sp[i].getAttribute('class').replace(' disable', '');
		born_sp[i].setAttribute('class', text);
	}
	var dead_sp = document.getElementsByClassName('dead smallpiece');
	for (var i = 0; i < 14; i++) {
		var text = dead_sp[i].getAttribute('class').replace(' disable', '');
		dead_sp[i].setAttribute('class', text + ' disable');
		dead_sp[i].children[0].innerHTML = 0;
		dead_sp[i].children[0].style.display = '';
	}
	var opt = document.getElementById('selMoveList').options;
	while (opt.length > 1) {
		opt.remove(opt.length - 1);
	}
	document.getElementById('step-buttons').style.display = '';
}

function restart() {
	restart_silence();
	var pstr = prompt('设置基本倍率和抢先倍率:', '10 1');
	pstr = pstr.split(' ');
	if (pstr[0] == undefined) pstr[0] = 10;
	if (pstr[1] == undefined) pstr[1] = 1;
	init_rate = +pstr[0];
	start_double = +pstr[1];
	kill_stack = [];
	kill_stack.push(new Kill(0, 0, 0, 0));
	peace_round.push(0);
	updateRate(kill_stack[0]);
}

function withdrawl() {
	if (state >= 4) return;
	var opt = document.getElementById('selMoveList').options;
	if (opt.length <= 1) return;
	unmakeMove(move_stack.pop());
	opt.remove(opt.length - 1);
	state = 0;
}

function changeSide() {
	var hpitem = document.getElementsByClassName('hpitem');
	hpitem[side].setAttribute('class', 'hpitem');
	side = 1 - side;
	hpitem[side].setAttribute('class', 'hpitem turn');
}

function getBoard(pos) {
	return board[pos[1]][pos[0].charCodeAt(0)-'A'.charCodeAt(0)];
}

function numPos(pos) {
	if (pos) {
		return (pos[0].charCodeAt(0)-'A'.charCodeAt(0)) * 4 + +pos[1];
	} else {
		return 32;
	}
}

function checkWinner() {
	var hp = document.getElementsByClassName('progress-bar-text-val');
	if (hp[0].firstChild.innerHTML <= 0) {
		return 'black';
	}
	if (hp[1].firstChild.innerHTML <= 0) {
		return 'red';
	}
}

function canMove(move) {
	if (move.from) {
		var from_p = +getBoard(move.from).getAttribute('val');
		if (from_p >>> 3 !== side + 1) return false;
		var to_p = +getBoard(move.to).getAttribute('val');
		if ((from_p >>> 3) === (to_p >>> 3)) return false;
		if (move.from[0] != move.to[0] && move.from[1] != move.to[1]) return false;
		if (from_p % 8 === 5) { // Cannon
			var i, j, beg, end, count;
			if (move.from[0] === move.to[0]) {
				j = move.from.charCodeAt(0) - 'A'.charCodeAt(0);
				if (move.from[1] > move.to[1]) {
					beg = +move.to[1];
					end = +move.from[1];
				} else {
					beg = +move.from[1];
					end = +move.to[1];
				}
				count = 0;
				for (i = beg + 1; i < end; i++) {
					if (board[i][j].getAttribute('val') != 0) count++;
					if (count > 1) return false;
				}
			} else {
				i = +move.from[1];
				if (move.from[0] > move.to[0]) {
					beg = move.to.charCodeAt(0) - 'A'.charCodeAt(0);
					end = move.from.charCodeAt(0) - 'A'.charCodeAt(0);
				} else {
					beg = move.from.charCodeAt(0) - 'A'.charCodeAt(0);
					end = move.to.charCodeAt(0) - 'A'.charCodeAt(0);
				}
				count = 0;
				for (j = beg + 1; j < end; j++) {
					if (board[i][j].getAttribute('val') != 0) count++;
					if (count > 1) return false;
				}
			}
			if (count === 0) return false;
		} else {
			if (to_p === 0) return true;
			if (to_p === 1) return false;
			if (Math.abs(
					(move.from.charCodeAt(0) - move.to.charCodeAt(0)) + 
					(move.from[1] - move.to[1])
				) !== 1
			) return false;
			var canAttack = [
				[1, 1, 1, 1, 1, 1, 0], // King
				[0, 1, 1, 1, 1, 1, 1], // Advisor
				[0, 0, 1, 1, 1, 1, 1], // Bishop
				[0, 0, 0, 1, 1, 1, 1], // Rook
				[0, 0, 0, 0, 1, 1, 1], // kNight
				[1, 1, 1, 1, 1, 1, 1], // Cannon
				[1, 0, 0, 0, 0, 0, 1]  // Pawn
			];
			return Boolean(canAttack[from_p % 8][to_p % 8]);
		}
	}
	if (move.capture.isCovered) {
		var v = move.capture.piece;
		var id = (v >= 16) * 7 + (v % 8);
		if (born_count[id] <= 0) return false;
	}
	return true;
}

function updateMove(move) {
	if (!canMove(move)) return;
	makeMove(move);
	move_stack.push(move);
	var display = document.getElementById('selMoveList');
	var opt = document.createElement('option');
	var round = (move_stack.length + 1) / 2;
	var show_rnd = ~~round === round;
	var info;
	if (move.from == undefined) {
		info = '__' + move.to + ' (' + getFenName(move.capture.piece) + ')';
	} else {
		info = move.from + move.to;
		if (move.capture.isCovered)
			info += ' (' + getFenName(move.capture.piece) + ')';
	}
	opt.innerHTML = '&nbsp;' + (show_rnd ? (round + '.') : '&emsp;&emsp;') + info;
	opt.value = (numPos(move.from) << 5) + numPos(move.to);
	display.add(opt);
	var winner = checkWinner();
	if (winner) {
		cur_move_id = move_stack.length;
		state = winner === 'red' ? 4 : 5;
		setTimeout(function(){alert(winner + ' wins');}, 500);
	}
	if (peace_round[peace_round.length - 1] >= 30) {
		cur_move_id = move_stack.length;
		state = 6;
		setTimeout(function(){alert('Drawning game');}, 500);
	}
	document.getElementById('step-buttons').style.display = 'block';
}

function updateBornPiece(id, inv) {
	var sp = document.getElementById('chosenpanel').getElementsByClassName('smallpiece')[id];
	var text = sp.getAttribute('class');
	if (inv) {
		if (born_count[id] === 0) {
			sp.setAttribute('class', text.replace(' disable', ''));
		}
		born_count[id]++;
	} else {
		born_count[id]--;
		if (born_count[id] <= 0) {
			sp.setAttribute('class', text + ' disable');
		}
	}
}

function updateDeadPiece(id, inv) {
	var dead_sp = document.getElementsByClassName('dead smallpiece')[id];
	var text = dead_sp.getAttribute('class');
	if (inv) {
		modifyHP(health[id % 7], id < 7, true);
		dead_count[id]--;
		dead_sp.children[0].innerHTML = dead_count[id];
		if (dead_count[id] === 0) {
			dead_sp.setAttribute('class', text + ' disable');
		}
		if (dead_count[id] === 1) {
			dead_sp.children[0].style.display = '';
		}
	} else {
		modifyHP(-health[id % 7], id < 7, true);
		dead_sp.setAttribute('class', text.replace(' disable', ''));
		dead_count[id]++;
		dead_sp.children[0].innerHTML = dead_count[id];
		if (dead_count[id] > 1) {
			dead_sp.children[0].style.display = 'block';
		}
	}
}

function multikill() {
	var sigma = 0;
	for (var i = 1; i < kill_stack.length; i++) {
		while (i < kill_stack.length && kill_stack[i].red) i++;
		if (kill_stack[i - 1].red > 2) sigma += kill_stack[i - 1].red;
	}
	for (var i = 1; i < kill_stack.length; i++) {
		while (i < kill_stack.length && kill_stack[i].black) i++;
		if (kill_stack[i - 1].black > 2) sigma += kill_stack[i - 1].black;
	}
	return sigma == 0 ? 1 : sigma;
}

function updateRate(kill) {
	var hp = document.getElementsByClassName('progress-bar-text-val');
	var hpdiff = hp[0].firstChild.innerHTML - hp[1].firstChild.innerHTML;
	var r = (init_rate + Math.abs(hpdiff)) * start_double * multikill();
	document.getElementById('rate').children[0].innerHTML = r;
	var kill_div = document.getElementById('kill');
	kill_div.children[1].children[0].innerHTML = kill.red;
	kill_div.children[1].children[1].innerHTML = kill.redmax;
	kill_div.children[2].children[0].innerHTML = kill.black;
	kill_div.children[2].children[1].innerHTML = kill.blackmax;
	document.getElementById('peaceround').children[0].innerHTML = peace_round[peace_round.length - 1];
}

function makeMove(move) {
	var from, v, id;
	var to = getBoard(move.to);
	var last_kill = new Kill(kill_stack[kill_stack.length - 1]);
	if (move.capture.isCovered) {
		v = move.capture.piece;
		id = (v >= 16) * 7 + (v % 8);
		updateBornPiece(id);
		if (move.from) {
			from = getBoard(move.from);
			to.setAttribute('val', from.getAttribute('val'));
			to.setAttribute('class', from.getAttribute('class'));
			to.innerHTML =  from.innerHTML;
			from.setAttribute('val', '0');
			from.setAttribute('class', 'piece empty');
			from.innerHTML = '';
			updateDeadPiece(id);
			if (side == 0) {
				if (v >= 16) {
					last_kill.red++;
					if (last_kill.red > last_kill.redmax)
						last_kill.redmax = last_kill.red;
				} else {
					last_kill.red = 0;
				}
			} else {
				if (v < 16) {
					last_kill.black++;
					if (last_kill.black > last_kill.blackmax)
						last_kill.blackmax = last_kill.black;
				} else {
					last_kill.black = 0;
				}
			}
		} else {
			to.setAttribute('val', move.capture.piece);
			to.setAttribute('class', 'piece' + (v < 16 ? ' red' : ''));
			to.innerHTML = pieceName[id];
			if (side == 0) {
				last_kill.red = 0;
			} else {
				last_kill.black = 0;
			}
		}
		peace_round.push(0);
	} else {
		v = move.capture;
		from = getBoard(move.from);
		to.setAttribute('val', from.getAttribute('val'));
		to.setAttribute('class', from.getAttribute('class'));
		to.innerHTML = from.innerHTML;
		from.setAttribute('val', '0');
		from.setAttribute('class', 'piece empty');
		from.innerHTML = '';
		if (v !== 0) {
			updateDeadPiece((v >= 16) * 7 + (v % 8));
			peace_round.push(0);
			if (side == 0) {
				last_kill.red++;
				if (last_kill.red > last_kill.redmax)
					last_kill.redmax = last_kill.red;
			} else {
				last_kill.black++;
				if (last_kill.black > last_kill.blackmax)
					last_kill.blackmax = last_kill.black;
			}
		} else {
			if (side == 0) {
				last_kill.red = 0;
			} else {
				last_kill.black = 0;
			}
			peace_round.push(peace_round[peace_round.length - 1] + 1);
		}
	}
	kill_stack.push(last_kill);
	updateRate(last_kill);
	changeSide();
}

function unmakeMove(move) {
	var from, v, id;
	var to = getBoard(move.to);
	if (move.capture.isCovered) {
		v = move.capture.piece;
		id = (v >= 16) * 7 + (v % 8);
		updateBornPiece(id, true);
		if (move.from != undefined) {
			console.assert(+to.getAttribute('val') % 8 === 5);
			from = getBoard(move.from);
			from.setAttribute('val', to.getAttribute('val'));
			from.setAttribute('class', to.getAttribute('class'));
			from.innerHTML = to.innerHTML;
			updateDeadPiece(id, true);
		}
		to.setAttribute('val', '1');
		to.setAttribute('class', 'piece covered');
		to.innerHTML = '';
	} else {
		v = move.capture;
		id = (v >= 16) * 7 + (v % 8);
		from = getBoard(move.from);
		from.setAttribute('val', to.getAttribute('val'));
		from.setAttribute('class', to.getAttribute('class'));
		from.innerHTML = to.innerHTML;
		to.setAttribute('val', v);
		to.setAttribute('class', 'piece' + (v < 16 ? ' red' : ''));
		if (v !== 0) {
			to.setAttribute('class', 'piece' + (v < 16 ? ' red' : ''));
			to.innerHTML = pieceName[id];
			updateDeadPiece(id, true);
		} else {
			to.setAttribute('class', 'piece empty');
			to.innerHTML = '';
		}
	}
	peace_round.pop();
	kill_stack.pop()
	updateRate(kill_stack[kill_stack.length - 1]);
	changeSide();
}

function lastMove() {
	if (state < 4) return;
	if (cur_move_id == 0) return;
	unmakeMove(move_stack[--cur_move_id]);
}

function nextMove() {
	if (state < 4) return;
	if (cur_move_id == move_stack.length) return;
	makeMove(move_stack[cur_move_id++]);
}

function getFenName(piece) {
	var name = 'KABRNCP';
	if (piece < 8) return '?';
	if (piece < 16) return name[piece % 8];
	return name[piece % 8].toLowerCase();
}

function writeFen() {
	var fenstr = '';
	var count = 0;
	var piece;
	for (var i = 0; i < 4; i++) {
		for (var j = 0; j < 8; j++) {
			piece = +board[i][j].getAttribute('val');
			if (piece == 0) {
				count++;
			} else {
				if (count > 0) {
					fenstr += count;
					count = 0;
				}
				fenstr += getFenName(piece);
			}
		}
		if (count > 0) {
			fenstr += count;
			count = 0;
		}
		fenstr += (i == 3) ? ' ' : '/';
	}
	var total = [1, 2, 2, 2, 2, 2, 5];
	var count = 0;
	var name = 'KABRNCP';
	for (var i = 0; i < 7; i++) {
		count += total[i] - born_count[i];
		if (born_count[i]) {
			if (count) {
				fenstr += count;
				count = 0;
			}
			fenstr += name[i].repeat(born_count[i]);
		}
	}
	if (count) {
		fenstr += count;
		count = 0;
	}
	fenstr += '/';
	for (var i = 0; i < 7; i++) {
		count += total[i] - born_count[i + 7];
		if (born_count[i + 7]) {
			if (count) {
				fenstr += count;
				count = 0;
			}
			fenstr += name[i].toLowerCase().repeat(born_count[i + 7]);
		}
	}
	if (count) {
		fenstr += count;
		count = 0;
	}
	fenstr += ' ' + (side ? 'b' : 'w');
	fenstr += ' ' + peace_round[peace_round.length - 1];
	fenstr += ' ' + move_stack.length;
	return fenstr;
}

function printFen() {
	var composition = document.getElementById('composition');
	composition.value = writeFen();
	composition.select();
	document.execCommand('copy');
}

function saveComposition() {
	var info = '' + init_rate + ' ' + start_double + '\n';
	var opt = document.getElementById('selMoveList').options;
	for (var i = 1; i < opt.length; i++) {
		var offset = 3;
		if (i % 2 == 1) {
			offset += ('' + (i+1)/2).length - 1;
		}
		info += opt[i].innerText.substr(offset) + '\n';
	}
	var composition = document.getElementById('composition');
	composition.value = info;
	composition.select();
	document.execCommand('copy');
}

function fenchar2int(fenchar) {
	switch (fenchar) {
		case 'K': return 8;
		case 'A': return 9;
		case 'B': return 10;
		case 'R': return 11;
		case 'N': return 12;
		case 'C': return 13;
		case 'P': return 14;
		case 'k': return 16;
		case 'a': return 17;
		case 'b': return 18;
		case 'r': return 19;
		case 'n': return 20;
		case 'c': return 21;
		case 'p': return 22;
		case '?': return 1;
		default: return 0;
	}
}

function loadComposition() {
	restart_silence();
	kill_stack = [];
	var composition = document.getElementById('composition');
	var display = document.getElementById('selMoveList');
	try {
		var step = composition.value.split('\n');
		var r = step[0].split(' ');
		init_rate = +r[0];
		start_double = +r[1];
		kill_stack.push(new Kill(0, 0, 0, 0));
		peace_round.push(0);
		updateRate(kill_stack[0]);
		var from, to, capture;
		for (var i = 1; i < step.length; i++) {
			if (i == step.length - 1 && step[i] == '') break;
			from = step[i].substr(0, 2);
			to = step[i].substr(2, 2);
			if (step[i].length == 8) {
				if (from == '__') {
					from = undefined;
				}
				capture = {};
				capture.isCovered = true;
				capture.piece = fenchar2int(step[i][6]);
			} else if (step[i].length == 4) {
				capture = +getBoard(to).getAttribute('val');
			} else {
				throw 'parsing error';
			}
			var m = new Move(from, to, capture);
			makeMove(m);
			move_stack.push(m);
			var opt = document.createElement('option');
			var round = (move_stack.length + 1) / 2;
			var show_rnd = ~~round === round;
			opt.innerHTML = '&nbsp;' + (show_rnd ? (round + '.') : '&emsp;&emsp;') + step[i];
			opt.value = (numPos(from) << 5) + numPos(to);
			display.add(opt);
		}
	} catch (e) {
		console.log(e + '\ninvalid composition string');
	}
	cur_move_id = move_stack.length;
	state = 6;
	document.getElementById('step-buttons').style.display = 'block';
}

function readFen() {
	try {
		var fenstr = document.getElementById('composition').value.split(' ');
		var cols = fenstr[0].split('/');
		dead_count = [1, 2, 2, 2, 2, 2, 5, 1, 2, 2, 2, 2, 2, 5];
		for (var i = 0; i < 4; i++) {
			var j = 0;
			for (var c = 0; c < cols[i].length; c++) {
				var ch = cols[i][c];
				if (isNaN(ch)) {
					var piece = fenchar2int(ch);
					var type;
					if (piece == 1) {
						type = ' covered';
						board[i][j].innerHTML = '';
					} else {
						if (piece < 16) {
							type = ' red';
							board[i][j].innerHTML = pieceName[piece % 8];
							dead_count[piece % 8]--;
						} else {
							type = '';
							board[i][j].innerHTML = pieceName[7 + piece % 8];
							dead_count[piece % 8 + 7]--;
						}
					}
					board[i][j].setAttribute('class', 'piece' + type);
					board[i][j].setAttribute('val', piece);	
					j++;		
				} else {
					var k = j;
					j += +ch;
					for (; k < j; k++) {
						board[i][k].setAttribute('class', 'piece empty');
						board[i][k].setAttribute('val', 0);
						board[i][k].innerHTML = '';
					}
				}
			}
		}
		var covered = fenstr[1].split('/');
		born_count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		var id;
		for (var c = 0; c < covered[0].length; c++) {
			var ch = covered[0][c];
			if (isNaN(ch)) {
				id = fenchar2int(ch) % 8;
				dead_count[id]--;
				born_count[id]++;
			}
		}
		for (var c = 0; c < covered[1].length; c++) {
			var ch = covered[1][c];
			if (isNaN(ch)) {
				id = fenchar2int(ch) % 8 + 7;
				dead_count[id]--;
				born_count[id]++;
			}
		}
		var hp = [60, 60];
		for (var i = 0; i < 7; i++) {
			if (dead_count[i]) {
				hp[0] -= dead_count[i] * health[i];
			}	
		}
		for (var i = 0; i < 7; i++) {
			if (dead_count[i + 7]) {
				hp[1] -= dead_count[i + 7] * health[i];
			}	
		}
		modifyHP(hp[0], 'red');
		modifyHP(hp[1], 'blue');
		var born_sp = document.getElementById('chosenpanel').getElementsByClassName('smallpiece');
		for (var i = 0; i < 14; i++) {
			var text = born_sp[i].getAttribute('class').replace(' disable', '');
			if (born_count[i]) {
				born_sp[i].setAttribute('class', text);
			} else {
				born_sp[i].setAttribute('class', text + ' disable');
			}
		}
		var dead_sp = document.getElementsByClassName('dead smallpiece');
		for (var i = 0; i < 14; i++) {
			var text = dead_sp[i].getAttribute('class').replace(' disable', '');
			dead_sp[i].children[0].innerHTML = dead_count[i];
			if (dead_count[i]) {
				dead_sp[i].setAttribute('class', text);
				if (dead_count[i] > 1) {
					dead_sp[i].children[0].style.display = 'block';
				}
			} else {
				dead_sp[i].setAttribute('class', text + ' disable');
				dead_sp[i].children[0].style.display = '';
			}
		}
		side = fenstr[2] == 'w' ? 1 : 0;
		changeSide();
		peace_round.push(+fenstr[3]);
		init_rate = 10;
		start_double = 1;
		kill_stack = [];
		kill_stack.push(new Kill(0, 0, 0, 0));
		updateRate(kill_stack[0]);
		document.getElementById('step-buttons').style.display = '';
		state = 0;
	} catch (e) {
		console.log(e + '\ninvalid FEN string');
		restart_silence();
		init_rate = 10;
		start_double = 1;
		kill_stack = [];
		kill_stack.push(new Kill(0, 0, 0, 0));
		peace_round.push(0);
		updateRate(kill_stack[0]);
	}
}
