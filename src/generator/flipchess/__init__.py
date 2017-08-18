import random

class Generator(object):
	def __init__(self):
		self.ready = False
		self._board = [[0] * 8, [0] * 8, [0] * 8, [0] * 8]
	def newgame(self):
		num = [1, 2, 2, 2, 2, 2, 5]
		piece = [range(8, 15), range(16, 23)]
		dataset = []
		for r in piece:
			for i in range(7):
				t = num[i]
				while t:
					dataset.append(r[i])
					t -= 1
		for i in range(4):
			for j in range(8):
				which = random.randint(0, len(dataset) - 1)
				self._board[i][j] = dataset.pop(which)
		self.ready = True
	def get(self, pos):
		if not self.ready: return 'not ready, call newgame first'
		name = ['K', 'A', 'B', 'R', 'N', 'C', 'P']
		j = ord(pos[0].upper()) - ord('A')
		i = int(pos[1])
		p = self._board[i][j]
		if (p < 16):
			return name[p % 8]
		return name[p % 8].lower()
	def showFirstFour(self):
		if not self.ready: return 'not ready, call newgame first'
		s = ' '
		s += self.get('B1') + '\n'
		s += self.get('D0') + '\n'
		s += '  ' + self.get('E3') + '\n'
		s += ' ' + self.get('G2')
		print(s)
