// ============================================================
//  IEEE Helwan Robotics Competition — RC Race Car Firmware
//  Board  : ESP32 NodeMCU (DevKit)
//  Driver : L298N Dual H-Bridge Motor Driver
//  Motors : 4x DC Gear Motors (Left pair + Right pair)
// ============================================================
//
//  HOW PWM CONTROLS SPEED & TORQUE (Physical Explanation)
//  -------------------------------------------------------
//  PWM (Pulse Width Modulation) rapidly switches the motor
//  supply voltage ON and OFF at a fixed frequency (here 1 kHz).
//
//  • Duty Cycle 0%   (value   0) → Motor always OFF  → No torque, no speed
//  • Duty Cycle 50%  (value 128) → Motor ON half the time → ~Half speed & torque
//  • Duty Cycle 100% (value 255) → Motor always ON   → Max torque & max speed
//
//  The motor's inertia "averages" the pulses, so it spins
//  proportionally to the duty cycle. Higher duty = more average
//  voltage = more current = more electromagnetic torque = more RPM.
//
//  ⚠️  IMPORTANT — ESP32 vs Arduino:
//  The ESP32 does NOT support Arduino's analogWrite().
//  Instead it uses the LEDC (LED Control) peripheral which
//  provides hardware PWM channels. We use ledcWrite() here.
// ============================================================


// ------------------------------------------------------------
//  L298N — DIRECTION CONTROL PINS  (Digital: HIGH / LOW)
// ------------------------------------------------------------
//
//   Left  Motors (Channel A — ENA):  IN1 & IN2
//   Right Motors (Channel B — ENB):  IN3 & IN4
//
//   Truth Table for one channel:
//   ┌──────┬──────┬─────────────────────────┐
//   │  IN1 │  IN2 │  Result                 │
//   ├──────┼──────┼─────────────────────────┤
//   │ HIGH │  LOW │  Forward                │
//   │  LOW │ HIGH │  Backward               │
//   │  LOW │  LOW │  Brake (free-wheel)     │
//   │ HIGH │ HIGH │  Brake (short circuit)  │
//   └──────┴──────┴─────────────────────────┘

#define IN1  27   // Left  motors — forward signal
#define IN2  26   // Left  motors — backward signal
#define IN3  25   // Right motors — forward signal
#define IN4  33   // Right motors — backward signal


// ------------------------------------------------------------
//  L298N — SPEED CONTROL PINS  (PWM via LEDC)
// ------------------------------------------------------------
#define ENA  32   // Left  motors — PWM speed/torque control
#define ENB  14   // Right motors — PWM speed/torque control


// ------------------------------------------------------------
//  ESP32 LEDC (PWM) Configuration
// ------------------------------------------------------------
//  The ESP32 has 16 independent PWM channels (0–15).
//  We assign one channel per enable pin.
//
//  • Frequency : 1000 Hz  — smooth enough for DC motors
//  • Resolution: 8-bit    — duty cycle values from 0 to 255

#define PWM_FREQ       1000   // Hz
#define PWM_RESOLUTION    8   // bits  →  0–255 range
#define PWM_CHANNEL_A     0   // LEDC channel for ENA (Left)
#define PWM_CHANNEL_B     1   // LEDC channel for ENB (Right)


// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("=== RC Race Car — IEEE Helwan ===");

  // --- Direction pins: standard digital outputs ---
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // --- Speed pins: attach to LEDC PWM channels ---
  // ledcSetup(channel, frequency, resolution_bits)
  ledcSetup(PWM_CHANNEL_A, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_B, PWM_FREQ, PWM_RESOLUTION);

  // ledcAttachPin(gpio_pin, channel)
  ledcAttachPin(ENA, PWM_CHANNEL_A);
  ledcAttachPin(ENB, PWM_CHANNEL_B);

  // Start with car stopped
  stopCar();
  Serial.println("Setup complete. Starting test sequence...");
  delay(1000);
}


// ============================================================
//  MOVEMENT FUNCTIONS
// ============================================================

// ------------------------------------------------------------
//  setSpeed(speedA, speedB)
//  Internal helper — writes PWM duty cycle to both channels.
//  speed range: 0 (stop) → 255 (full power)
// ------------------------------------------------------------
void setSpeed(int speedA, int speedB) {
  // Clamp values to valid 8-bit range
  speedA = constrain(speedA, 0, 255);
  speedB = constrain(speedB, 0, 255);

  // ledcWrite(channel, duty_cycle_0_to_255)
  ledcWrite(PWM_CHANNEL_A, speedA);  // Left  motors
  ledcWrite(PWM_CHANNEL_B, speedB);  // Right motors
}


// ------------------------------------------------------------
//  moveForward(speed)
//  Both motor pairs spin in the FORWARD direction.
//  speed: 0–255
// ------------------------------------------------------------
void moveForward(int speed) {
  Serial.print(">> FORWARD  | Speed: ");
  Serial.println(speed);

  // Left motors — forward
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  // Right motors — forward
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  // Apply PWM speed (same for both sides = straight line)
  setSpeed(speed, speed);
}


// ------------------------------------------------------------
//  moveBackward(speed)
//  Both motor pairs spin in the REVERSE direction.
//  speed: 0–255
// ------------------------------------------------------------
void moveBackward(int speed) {
  Serial.print(">> BACKWARD | Speed: ");
  Serial.println(speed);

  // Left motors — backward
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  // Right motors — backward
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  setSpeed(speed, speed);
}


// ------------------------------------------------------------
//  turnRight(speed)
//  Tank-turn: LEFT motors forward, RIGHT motors backward.
//  This pivots the car clockwise around its center.
//  speed: 0–255
// ------------------------------------------------------------
void turnRight(int speed) {
  Serial.print(">> TURN RIGHT | Speed: ");
  Serial.println(speed);

  // Left motors — forward (push car to the right)
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  // Right motors — backward (pull car to the right)
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  setSpeed(speed, speed);
}


// ------------------------------------------------------------
//  turnLeft(speed)
//  Tank-turn: RIGHT motors forward, LEFT motors backward.
//  This pivots the car counter-clockwise around its center.
//  speed: 0–255
// ------------------------------------------------------------
void turnLeft(int speed) {
  Serial.print(">> TURN LEFT  | Speed: ");
  Serial.println(speed);

  // Left motors — backward
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  // Right motors — forward
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  setSpeed(speed, speed);
}


// ------------------------------------------------------------
//  stopCar()
//  Cuts power to all motors immediately (free-wheel stop).
//  Sets PWM to 0 — no voltage, no torque.
// ------------------------------------------------------------
void stopCar() {
  Serial.println(">> STOP");

  // Remove direction signals (free-wheel brake)
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);

  // Cut PWM — 0% duty cycle = 0V average = no torque
  setSpeed(0, 0);
}


// ============================================================
//  MAIN LOOP — Test Sequence
// ============================================================
void loop() {

  // --- Step 1: Full speed forward for 2 seconds ---
  // Duty cycle 255 = 100% → Maximum voltage to motors
  // → Maximum torque and maximum RPM (fastest acceleration)
  moveForward(255);
  delay(2000);

  // --- Step 2: Stop for 1 second ---
  stopCar();
  delay(1000);

  // --- Step 3: Half speed backward for 2 seconds ---
  // Duty cycle 128 = ~50% → ~Half voltage to motors
  // → Reduced torque and ~half the max RPM
  moveBackward(128);
  delay(2000);

  // --- Step 4: Stop and pause before loop repeats ---
  stopCar();
  delay(3000);
}
