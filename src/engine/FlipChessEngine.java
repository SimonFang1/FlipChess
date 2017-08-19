package engine;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.Random;
import java.util.Scanner;

public class FlipChessEngine {
	boolean [] legalPos;
	int [] board;
	char [] pieceName;
	final int COVERED = 1;
	int side; // boolean var, used for bitwise operation
	int sideTag;
	int peaceRound;
	int totalRound;
//	int [] denseInt = {
//		0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 6
//	};
	int [] sparseInt = {0, 1, 3, 5, 7, 9, 11};
	boolean[][] canAttack = {
		{true, true, true, true, true, true, false},
		{false, true, true, true, true, true, true},
		{false, false, true, true, true, true, true},
		{false, false, false, true, true, true, true},
		{false, false, false, false, true, true, true},
		{true, true, true, true, true, true, true},
		{true, false, false, false, false, false, true}
	};
	final int [] hp_val = {30, 10, 5, 5, 5, 5, 2};
	int[] hp = new int[2];
	
	final int WIN_SCORE = 10000;
	final int MAX_SCORE = WIN_SCORE + 200;
	int max_depth; 
	Move best_move;
	int rand_branch;
	
//	boolean sig = false;
	Random random = new Random();
	
	public FlipChessEngine() {
		initLegalPos();
		board = new int[128];
		initPieceName();
		random.setSeed(System.currentTimeMillis());
	}

	public String writeFen() {
		String fenstr = "";
		int count = 0;
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int piece = board[ i*16 + j ];
				if (piece == 0) {
					count++;
				} else {
					if (count > 0) {
						fenstr += count;
						count = 0;
					}
					fenstr += pieceName[piece];
				}
			}
			if (count > 0) {
				fenstr += count;
				count = 0;
			}
			fenstr += i == 5 ? ' ' : '/';
		}
		// row0 and row7 are convered pieces
		// row1 and row6 are dead pieces
		// for simplicity, dead informations are omitted
		int [] coverRow = {0, 7};
		for (int i = 0; i < coverRow.length; i++) {
			for (int j = 0; j < 16; j++) {
				int piece = board[ coverRow[i]*16 + j ];
				if (piece == 0) {
					count++;
				} else {
					if (count > 0) {
						fenstr += count;
						count = 0;
					}
					fenstr += pieceName[piece];
				}
			}
			if (count > 0) {
				fenstr += count;
				count = 0;
			}
			fenstr += i == 1 ? ' ' : '/';
		}
		fenstr += side == 0 ? "w" : "b";
		fenstr += " " + peaceRound;
		fenstr += " " + totalRound;
		
		return fenstr;
	}

	private int pieceName2Int(char ch) {
		// KABRNCP
		switch (ch) {
			case '?': return 1;
//			case 'K': return 16;
//			case 'k': return 32;
//			case 'A': return 17;
//			case 'a': return 33;
//			case 'B': return 19;
//			case 'b': return 35;
//			case 'R': return 21;
//			case 'r': return 37;
//			case 'N': return 23;
//			case 'n': return 39;
//			case 'C': return 25;
//			case 'c': return 41;
//			case 'P': return 27;
//			case 'p': return 43;
//			case 'H': return 21;
//			case 'h': return 37;
//			case 'E': return 19;
//			case 'e': return 35;
			case 'K': return 8;
			case 'k': return 16;
			case 'A': return 9;
			case 'a': return 17;
			case 'B': return 10;
			case 'b': return 18;
			case 'R': return 11;
			case 'r': return 19;
			case 'N': return 12;
			case 'n': return 20;
			case 'C': return 13;
			case 'c': return 21;
			case 'P': return 14;
			case 'p': return 22;
			case 'H': return 12;
			case 'h': return 20;
			case 'E': return 10;
			case 'e': return 18;
			default: 
				System.out.println("unexpected character: " + ch);
				System.exit(-1);
		}
		return -1;
	}
	
	public void readFen(String fenstr) {
		clearBoard();
		int[] wcount = {1, 2, 2, 2, 2, 2, 5};
		int[] bcount = wcount.clone();
		String[] res= fenstr.split(" ");
		String[] line = res[0].split("/");
		for (int i = 0; i < 4; i++) {
			int j = 0;
			for (int c = 0; c < line[i].length(); c++) {
				char ch = line[i].charAt(c);
				if (Character.isDigit(ch)) {
					j += Integer.parseInt("" + ch);
				} else {
					int piece = pieceName2Int(ch);
					board[ (i+2)*16 + j + 4] = piece;
					if (piece >= 8 && piece < 16) {
						wcount[piece % 8]--;
					} else if (piece >= 16) {
						bcount[piece % 8]--;
					}
					j++;
				}
			}
		}
//		printBoard();
		line = res[1].split("/");
		for (int i = 0; i < line.length; i++) {
			int j = 0;
			int num = 0;
			for (int c = 0; c < line[i].length(); c++) {
				char ch = line[i].charAt(c);
				if (Character.isDigit(ch)) {
					num *= 10;
					num += ch - '0';
				} else {
					j += num;
					num = 0;
					int piece = pieceName2Int(ch);
					board[ (i*7)*16 + j] = piece;
					if (piece >= 8 && piece < 16) {
						wcount[piece % 8]--;
					} else if (piece >= 16) {
						bcount[piece % 8]--;
					}
					j++;
				}
			}
		}
		for (int i = 0; i < 7; i++) {
			while (wcount[i] != 0) {
				wcount[i]--;
				board[1*16 + sparseInt[i] + wcount[i]] = 8 + i;
			}
		}
		for (int i = 0; i < 7; i++) {
			while (bcount[i] != 0) {
				bcount[i]--;
				board[6*16 + sparseInt[i] + bcount[i]] =16 + i;
			}
		}
		side = res[2].equals("w") ? 0 : 1;
		peaceRound = Integer.parseInt(res[3]);
		totalRound = Integer.parseInt(res[4]);
		sync_hp();
	}
	
	private void initLegalPos() {
		legalPos = new boolean[128];
		for (int i = 0; i < 8; i++) {
			for (int j = 0; j < 16; j++) {
				if (i >= 2 && i < 6 && j >= 4 && j < 12) {
					legalPos[ i*16 + j ] = true;
				}
			}
		}
	}
	
	private void clearBoard() {
		for (int i = 0; i < 128; i++) {
			board[i] = 0;
		}
	}
	
	private void initPieceName() {
		pieceName = new char[23];
		String _pname = "KABRNCP";
		pieceName[COVERED] = '?';
		for (int i = 0; i < 7; i++) {
			pieceName[8 + i] = _pname.charAt(i);
		}
		for (int i = 0; i < 7; i++) {
			pieceName[16 + i] = Character.toLowerCase(_pname.charAt(i));
		}
	}
	
	public Move[] getNextTrivalAttackMoves() {
		sideTag = (side + 1) << 3;
		ArrayList<Move> moves = new ArrayList<>();
		int[] dir = {0x1, -0x1, 0x10, -0x10};
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int pos = i * 16 + j;
				int to;
				int piece = board[pos];
				if ((piece & sideTag) == 0) continue;
				if (piece % 8 == 5)  {
					// canon
					for (int k = 0; k < 4; k++) {
						boolean flagOver = false;
						for (int p = 1; p < 8; p++) {
							to = pos + p * dir[k];
							if (!legalPos[to]) break;
							if (board[to] != 0) {
								if (!flagOver) {
									flagOver = true;
								} else {
									if (board[to] != COVERED &&
										(board[to] & sideTag) == 0) {
										moves.add(new Move(pos, to));
									}
									break;
								}
							}
						}
					}
				} else {
					for (int k = 0; k < 4; k++) {
						to = pos + dir[k];
						if (legalPos[to] &&
							board[to] != COVERED && board[to] != 0 &&
							(((board[to] & sideTag) == 0) &&
							 canAttack[piece % 8][board[to] % 8])) {
								moves.add(new Move(pos, to));
						}
					}
				}
			}
		}
		return moves.toArray(new Move[0]);
	}
	
	public Move[] getNextTrivialMoves() {
		sideTag = (side + 1) << 3;
		ArrayList<Move> moves = new ArrayList<>();
		int[] dir = {0x1, -0x1, 0x10, -0x10};
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int pos = i * 16 + j;
				int piece = board[pos];
				if ((piece & sideTag) == 0 || piece % 8 == 5)
					continue;
				int to;
				for (int k = 0; k < 4; k++) {
					to = pos + dir[k];
					if (legalPos[to] && board[to] == 0) {
						moves.add(new Move(pos, to));
					}
				}
			}
		}
		return moves.toArray(new Move[0]);
	}
	
	public int [] getNontrivialCount() {
		int [] count = new int[14];
		int [] icount = {1, 3, 5, 7, 9, 11, 16};
		int index = 0;
		for (int i = 0; i < 16; i++) {
			if (i == icount[index]) {
				index++;
			}
			if (board[i] != 0) {
				count[index]++;
			}
		}
		index = 0;
		for (int i = 0; i < 16; i++) {
			if (i == icount[index]) {
				index++;
			}
			if (board[7*16 + i] != 0) {
				count[index + 7]++;
			}
		}
		return count;
		
	}
	
	
	public Move [] getNextRiskCannonAttack() {
		sideTag = (side + 1) << 3;
		ArrayList<Move> moves = new ArrayList<>();
		final int [] dir = {0x1, -0x1, 0x10, -0x10};
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int pos = i * 16 + j;
				int piece = board[pos];
				if (piece % 8 == 5 && (piece & sideTag) != 0) {
					for (int k = 0; k < 4; k++) {
						boolean flagOver = false;
						for (int p = 1; p < 8; p++) {
							int to = pos + p * dir[k];
							if (!legalPos[to]) break;
							if (board[to] != 0) {
								if (!flagOver) {
									flagOver = true;
								} else {
									if (board[to] == COVERED) {
										moves.add(new Move(pos, to));
									}
									break;
								}
							}
						}
					}
				}
			}
		}
		return moves.toArray(new Move[0]);
	}
	
	public Move [] getNextNontrivialMoves() {
		ArrayList<Move> moves = new ArrayList<>();
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int pos = i * 16 + j;
				if (board[pos] == COVERED) {
					moves.add(new Move(0, pos));
				}
			}
		}
		return moves.toArray(new Move[0]);
	}
	

	public int evaluate() {
		final int [] effect_val = {40, 30, 10, 8, 9, 15, 2};
		int open_piece = 0;
		int cover_piece = 0;
		final int sideTag = 8;
		final int [] dir = {0x1, -0x1, 0x10, -0x10};
		int control_cnt = 0;
		if (peaceRound >= 30) return 0;
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 8; j++) {
				int pos = (i + 2) * 16 + j + 4;
				if (board[pos] == 0 || board[pos] == COVERED)
					continue;
				if ((board[pos] & sideTag) != 0) {
					open_piece += effect_val[board[pos] % 8];
				} else {
					open_piece -= effect_val[board[pos] % 8];
				}
				int to;
				if ((board[pos] & sideTag) != 0) {
					if (board[pos] % 8 == 5) {
						for (int k = 0; k < 4; k++) {
							boolean flagOver = false;
							for (int l = 1; l < 9; l++) {
								to = pos + l * dir[k];
								if (!legalPos[to]) break;
								if (board[to] != 0) {
									if (!flagOver) {
										flagOver = true;
									} else {
										control_cnt++;
									}
									break;
								} else {
									if (flagOver) {
										control_cnt++;
									}
								}
							}
						}
					} else {
						for (int k = 0; k < 4; k++) {
							to = pos + dir[k];
							if (legalPos[to] && board[to] != COVERED) {
								control_cnt++;
							}
						}
					}
				} else {
					if (board[pos] % 8 == 5) {
						for (int k = 0; k < 4; k++) {
							boolean flagOver = false;
							for (int l = 1; l < 9; l++) {
								to = pos + l * dir[k];
								if (!legalPos[to]) break;
								if (board[to] != 0) {
									if (!flagOver) {
										flagOver = true;
									} else {
										control_cnt--;
									}
									break;
								} else {
									if (flagOver) {
										control_cnt--;
									}
								}
							}
						}
					} else {
						for (int k = 0; k < 4; k++) {
							to= pos + dir[k];
							if (legalPos[to] && board[to] != COVERED) {
								control_cnt--;
							}
						}
					}
				}
			}
		}
		
		for (int j = 0; j < 16; j++) {
			if (board[j] != 0) {
				cover_piece += effect_val[board[j] % 8];
			}
		}
		for (int j = 0; j < 16; j++) {
			int pos = 7 * 16 + j;
			if (board[pos] != 0) {
				cover_piece -= effect_val[board[pos] % 8];
			}
		}


		int score = (int) Math.round((open_piece + cover_piece * 0.8 + control_cnt + (hp[0]-hp[1])) * 10);
//		int score = (int) Math.round((hp_w-hp_b) * 10);

////		if (score < 410 && score > 370) { 
//			System.out.print("" + open_piece + " ");
//			System.out.print("" + cover_piece + " ");
//			System.out.print("" + control_cnt + " ");
//			System.out.print("" + (hp[0]-hp[1]) + " ");
//			System.out.println(score);
//			System.out.println(writeFen() + " " + deadInfo());
////		}
		return score;
	}	
	

	private void sync_hp() {
		hp[0] = hp[1] = 60;
		for (int j = 0; j < 16; j++) {
			int pos = 1 * 16 + j;
			if (board[pos] != 0) {
				hp[0] -= hp_val[board[pos] % 8];
			}
		}
		for (int j = 0; j < 16; j++) {
			int pos = 6 * 16 + j;
			if (board[pos] != 0) {
				hp[1] -= hp_val[board[pos] % 8];
			}
		}
	}
	
	private void capture_piece(int pos, int piece, boolean inv) {
		int _side = piece < 16 ? 0 : 1;
		if (inv) {
			board[pos] = 0;
			hp[_side] += hp_val[piece % 8];
		} else {
			board[pos] = piece;
			hp[_side] -= hp_val[piece % 8];
		}
	}
	
	public int makeMove(Move m) {
		int capture = board[m.to];
		board[m.to] = board[m.from];
		board[m.from] = 0;
		return capture;
	}
	
	public void unmakeMove(Move m, int capture) {
		board[m.from] = board[m.to];
		board[m.to] = capture;
	}
	
	public Probability [] getProbabilities() {
//		int [] pieceId = {
//				16, 17, 19, 21, 23, 25, 27,
//				32, 33, 35, 37, 39, 41, 43
//			};
		int [] pieceId = {
				8, 9, 10, 11, 12, 13, 14,
				16, 17, 18, 19, 20, 21, 22
			};
		
		LinkedList<Integer> pId = new LinkedList<>();
		LinkedList<Integer> selected = new LinkedList<>();
		int [] ncount = getNontrivialCount();
		int ncount_len = 0;
		for (int i = 0; i < ncount.length; i++) {
			if (ncount[i] != 0) {
				ncount_len++;
				pId.add(i);
			}
		}
		int branch;
		if (rand_branch == 0) {
			branch = ncount_len;
		} else {
			branch = rand_branch < ncount_len ? rand_branch : ncount_len;
		}
		if (branch < ncount_len / 2) {
			int t = branch;
			while (t > 0) {
				int id = random.nextInt(t);
				selected.add(pId.get(id));
				pId.remove(id);
				t--;
			}
		} else {
			int t = ncount_len - branch;
			while (t > 0) {
				pId.remove(random.nextInt(t));
				t--;
			}
			selected = pId;
		}
		LinkedList<Probability> probabilities = new LinkedList<>();
		int sum = 0;
		for (int s : selected) {
			sum += ncount[s];
		}
		for (int s : selected) {
			probabilities.add(new Probability(pieceId[s], ncount[s] * 1.0 / sum));
		}
		
		return probabilities.toArray(new Probability[0]);
	}
	
	public int getBornPos(int piece) {
		int pos = sparseInt[piece % 8];
		if (piece >= 16) {
			pos += 7 * 16;
		}
		while (board[pos] == 0) {
			pos++;
		}
		return pos;
	}
	
	public int getDeadPos(int piece) {
		int pos = sparseInt[piece % 8];
		pos += piece < 16 ? 16 : 6*16;
		while (board[pos] != 0) {
			pos++;
		}
		return pos;
	}
	
	public int alphaBetaSearch(int depth, int alpha, int beta) {
		int value;
		int prev_peaceRound;
		if (depth <= 0) {
			Move [] attackMoves = getNextTrivalAttackMoves();
			if (attackMoves.length == 0)
				return (side == 0 ? 1 : -1) * evaluate();
			for (Move m : attackMoves) {
				if (Debug.enable) {
					Debug.string_stack.push(writeFen());
				}
				int capture = makeMove(m);
				int deadPos = getDeadPos(capture);
				capture_piece(deadPos, capture, false);
				if (hp[1 - side] <= 0) {
					value = WIN_SCORE - (max_depth - depth) + hp[side] - hp[1-side];
				} else {
					side = 1 - side;
					totalRound++;
					prev_peaceRound = peaceRound;
					peaceRound = 0;
					value = -alphaBetaSearch(depth, -beta, -alpha);
					peaceRound = prev_peaceRound;
					side = 1 - side;
					totalRound--;
				}
				unmakeMove(m, capture);
				capture_piece(deadPos, capture, true);
				if (Debug.enable) {
					String last = Debug.string_stack.pop();
					String cur = writeFen();
					if (!cur.equals(last)) {
						System.out.println("irreflexible move at attackMove(depth <= 0)");
						System.out.println(last);
						System.out.println(cur);
						System.exit(-1);
					}
				}
				if (value >= beta) return beta;
				if (value > alpha) {
					alpha = value;
					if (depth == max_depth) {
						best_move = m;
					}
				}
			}
			return alpha;
		}
		Move [] attackMoves = getNextTrivalAttackMoves();
		for (Move m : attackMoves) {
			if (Debug.enable) {
				Debug.string_stack.push(writeFen());
			}
			int capture = makeMove(m);
			int deadPos = getDeadPos(capture);
			capture_piece(deadPos, capture, false);
			if (hp[1 - side] <= 0) {
				value = WIN_SCORE - (max_depth - depth) + hp[side] - hp[1-side];
			} else {
				side = 1 - side;
				totalRound++;
				prev_peaceRound = peaceRound;
				peaceRound = 0;
				value = -alphaBetaSearch(depth - 1, -beta, -alpha);
				peaceRound = prev_peaceRound;
				side = 1 - side;
				totalRound--;
			}
			unmakeMove(m, capture);
			capture_piece(deadPos, capture, true);
			if (Debug.enable) {
				String last = Debug.string_stack.pop();
				String cur = writeFen();
				if (!cur.equals(last)) {
					System.out.println("irreflexible move at attackMove");
					System.out.println(last);
					System.out.println(cur);
					System.exit(-1);
				}
			}
			if (value >= beta) return beta;
			if (value > alpha) {
				alpha = value;
				if (depth == max_depth) {
					best_move = m;
				}
			}
		}

		Move [] trivalMoves = getNextTrivialMoves();
		for (Move m : trivalMoves) {
			if (Debug.enable) {
				Debug.string_stack.push(writeFen());
			}
			makeMove(m);
			side = 1 - side;
			totalRound++;
			peaceRound++;
			value = -alphaBetaSearch(depth - 1, -beta, -alpha);
			unmakeMove(m, 0);
			side = 1 - side;
			totalRound--;
			peaceRound--;
			if (Debug.enable) {
				String last = Debug.string_stack.pop();
				String cur = writeFen();
				if (!cur.equals(last)) {
					System.out.println("irreflexible move at trivalMoves");
					System.out.println(last);
					System.out.println(cur);
					System.exit(-1);
				}
			}
			if (value >= beta) return beta;
			if (value > alpha) {
				alpha = value;
				if (depth == max_depth) {
					best_move = m;
				}
			}
		}
		
		if (alpha > 0) return alpha;
		
		Probability [] probabilities = getProbabilities();
		Move [] riskCannonAttack = getNextRiskCannonAttack();
		for (Move m : riskCannonAttack) {
			double pvalue = 0.0;
			for (Probability p: probabilities) {
				if (Debug.enable) {
					Debug.string_stack.push(writeFen());
				}
				int bPos = getBornPos(p.piece);
				Move move = new Move(bPos, m.to);
				int capture = makeMove(move);
				int capture1 = makeMove(m);
				int deadPos = getDeadPos(capture1);
				capture_piece(deadPos, capture1, false);
				if (hp[1 - side] < 0) {
					int v = (WIN_SCORE - (max_depth - depth) + hp[side] - hp[1-side]);
					pvalue += v * p.rate;
				} else {
					side = 1 - side;
					totalRound++;
					prev_peaceRound = peaceRound;
					peaceRound = 0;
					int v = -alphaBetaSearch(depth - 1, -MAX_SCORE, MAX_SCORE);
					peaceRound = prev_peaceRound;
					pvalue += v * p.rate;
					side = 1 - side;
					totalRound--;
				}
				unmakeMove(m, capture1);
				capture_piece(deadPos, capture1, true);
				unmakeMove(move, capture);
				if (Debug.enable) {
					String last = Debug.string_stack.pop();
					String cur = writeFen();
					if (!cur.equals(last)) {
						System.out.println("irreflexible move at riskCannonAttack");
						System.out.println(last);
						System.out.println(cur);
						System.exit(-1);
					}
				}
			}
			if (pvalue >= beta) return beta;
			if (pvalue > alpha) {
				alpha = (int) (Math.round(pvalue));
				if (depth == max_depth) {
					best_move = m;
				}
			}
		}
		
		Move [] nontrivalMoves = getNextNontrivialMoves();
		for (Move m : nontrivalMoves) {
			double pvalue = 0.0;
			for (Probability p: probabilities) {
				if (Debug.enable) {
					Debug.string_stack.push(writeFen());
				}
				int bPos = getBornPos(p.piece);
				Move move = new Move(bPos, m.to);
				int capture = makeMove(move);  // capture == COVERED
				side = 1 - side;
				totalRound++;
				prev_peaceRound = peaceRound;
				peaceRound = 0;
				int v = -alphaBetaSearch(depth - 1, -MAX_SCORE, MAX_SCORE);
				peaceRound = prev_peaceRound;
				pvalue += v * p.rate;
				side = 1 - side;
				totalRound--;
				unmakeMove(move, capture);
				if (Debug.enable) {
					String last = Debug.string_stack.pop();
					String cur = writeFen();
					if (!cur.equals(last)) {
						System.out.println("irreflexible move at nontrivalMove");
						System.out.println(last);
						System.out.println(cur);
						System.exit(-1);
					}
				}
			}
			if (pvalue >= beta) return beta;
			if (pvalue > alpha) {
				alpha = (int) (Math.round(pvalue));
				if (depth == max_depth) {
					best_move = m;
				}
			}
		}
		return alpha;
	}
	
	public int getBestMove(int depth) {
		max_depth = depth;
		return alphaBetaSearch(depth, -MAX_SCORE, MAX_SCORE);
	}
	
	public void printBoard() {
		int [] row = {0, 1, 6, 7};
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 16; j++) {
				int pos = row[i] * 16 +j;
				System.out.print("" + board[pos] + " ");
			}
			System.out.println();
		}
		for (int i = 2; i < 6; i++) {
			for (int j = 4; j < 12; j++) {
				int pos = i * 16 +j;
				System.out.print("" + board[pos] + " ");
			}
			System.out.println();
		}
	}
	
	public String deadInfo() {
		String fenstr = "";
		int count = 0;
		int [] coverRow = {1, 6};
		for (int i = 0; i < coverRow.length; i++) {
			for (int j = 0; j < 16; j++) {
				int piece = board[ coverRow[i]*16 + j ];
				if (piece == 0) {
					count++;
				} else {
					if (count > 0) {
						fenstr += count;
						count = 0;
					}
					fenstr += pieceName[piece];
				}
			}
			if (count > 0) {
				fenstr += count;
				count = 0;
			}
			fenstr += i == 1 ? "" : "/";
		}
		return fenstr;
	}
	
	public static String translatePos(int pos) {
		return ""+ (char) ((int)'A' + pos % 16 - 4) + (pos / 16 - 2);
	}
	
	public String translateMove(Move m) {
		String name = "帥仕相俥馬砲兵將士象車馬炮卒";
		if (m.from == 0)
			return "uncover " + translatePos(m.to);
		int p1 = board[m.from];
		int p2 = board[m.to];
		String chinese = "";
		if (p1 < 16) {
			chinese += "r" + name.charAt(p1 % 8);
		} else {
			chinese += "b" + name.charAt(p1 % 8 + 7);
		}
		if (p2 != 0 && p2 != COVERED) {
			if (p2 < 16) {
				chinese += "r" + name.charAt(p2 % 8);
			} else {
				chinese += "b" + name.charAt(p2 % 8 + 7);
			}
		}

		return "from " + translatePos(m.from) + " to " + translatePos(m.to) + " " + chinese;
	}
	
	public void run(int depth) {
		if (depth <= 0)
			depth = 64;
		long start = System.currentTimeMillis();
		long end;
		for (int i = 1; i <= depth; i++) {
			int score = getBestMove(i);
			end = System.currentTimeMillis();
			System.out.println("depth:" + i + ", time: " + (end-start) + "ms");
			try {
				System.out.println("move: " + translateMove(best_move) + ", score: " + score);
//				System.out.println(writeFen());
			} catch (Exception e) {
				e.printStackTrace();
			}

//				printBoard();
//			System.out.println(writeFen());
			if (end-start > 20000) break;
		}
	}
	public static void main(String []args) {
		FlipChessEngine fce = new FlipChessEngine();
		@SuppressWarnings("resource")
		Scanner scanner = new Scanner(System.in);
//		String beginFenStr = "???C???A/?1?c????/?P????P?/????n??? K1ABBRRNN1C2PPP/kaabbrr1n1c1pppp b 1 9";
		String beginFenStr =  scanner.nextLine();
		fce.readFen(beginFenStr);
		System.out.println(fce.writeFen());
//		fce.printBoard();
		fce.rand_branch = 0;
		int depth = 0;
		fce.run(depth);
	}
}

