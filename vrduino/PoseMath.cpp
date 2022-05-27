#include "PoseMath.h"

/**
 * TODO: see header file for documentation
 */
void convertTicksTo2DPositions(uint32_t clockTicks[8], double pos2D[8])
{
  //use variable CLOCKS_PER_SECOND defined in PoseMath.h
  //for number of clock ticks a second

  double azimuth[4];
  double elevation[4];

  for (int i = 0; i < 4; i++) {
    azimuth[i] = -double(clockTicks[i*2]) / CLOCKS_PER_SECOND * 60 * 360 + 90;
    elevation[i] = double(clockTicks[i*2 + 1]) / CLOCKS_PER_SECOND * 60 * 360 - 90;

    pos2D[i*2]   = tan(azimuth[i] * 2 * PI / 360);
    pos2D[i*2+1] = tan(elevation[i] * 2 * PI / 360);
  }

}

/**
 * TODO: see header file for documentation
 */
void formA(double pos2D[8], double posRef[8], double Aout[8][8]) {

  // pos2D[2*i] refers to x position for i = 0, ... ,3
  // pos2D[2*i+1] refers to y position for i = 0, ... , 3
  // Same for posRef[8]

  for (int i = 0; i < 4; i++) {
    double x_i = posRef[2*i];
    double y_i = posRef[2*i + 1];
    double x_i_n = pos2D[2*i];
    double y_i_n = pos2D[2*i + 1];
    
    double row0[8] = {x_i, y_i, 1.0, 0.0, 0.0, 0.0, -x_i * x_i_n, -y_i * x_i_n};
    double row1[8] = {0.0, 0.0, 0.0, x_i, y_i, 1.0, -x_i * y_i_n, -y_i * y_i_n};

    for (int j = 0; j < 8; j++) {
      Aout[2*i][j] = row0[j];
      Aout[2*i + 1][j] = row1[j];
    }
  }
  

}


/**
 * TODO: see header file for documentation
 */
bool solveForH(double A[8][8], double b[8], double hOut[8]) {
  //use Matrix Math library for matrix operations
  //example:
  //int inv = Matrix.Invert((double*)A, 8);
  //if inverse fails (Invert returns 0), return false
  int inv = Matrix.Invert((double*)A, 8);
  if (inv == 0) return false;

  Serial.printf("A: ");
  for (int i = 0; i < 8; i++) {
    Serial.printf("\n");
    for (int j = 0; j < 8; j++) {
      Serial.printf("%03f ", A[i][j]);
    }
  }
  Serial.printf("\n");

  Serial.printf("b: ");
  for (int i = 0; i < 8; i++) {
    Serial.printf("%03f ", b[i]);
  }
  Serial.printf("\n");

  Serial.printf("hOut Before: ");
  for (int i = 0; i < 8; i++) {
    Serial.printf("%03f ", hOut[i]);
  }
  Serial.printf("\n");
  // A = input matrix (m x p)
  // B = input matrix (p x n)
  // m = number of rows in A
  // p = number of columns in A = number of rows in B
  // n = number of columns in B
  // C = output matrix = A*B (m x n)
  Matrix.Multiply((double*)A, (double*)b, 8, 8, 1, (double*)hOut);

  Serial.printf("hOut After: ");
  for (int i = 0; i < 8; i++) {
    Serial.printf("%03f ", hOut[i]);
  }
  Serial.printf("\n"); 
  return true;

}


/**
 * TODO: see header file for documentation
 */
void getRtFromH(double h[8], double ROut[3][3], double pos3DOut[3]) {

  // Compute R[:,0] by normalizing the first column of homography matrix H
  double col1Norm = sqrt( h[0] * h[0] + h[3] * h[3] + h[6] * h[6] );
  ROut[0][0] = h[0] / col1Norm;
  ROut[1][0] = h[3] / col1Norm;
  ROut[2][0] = -h[6] / col1Norm;

  // Compute R[:,1] via Gram-Schmidt orthogonalization
  double proj = ROut[0][0] * h[1] + ROut[1][0] * h[4] - ROut[2][0] * h[7];
  ROut[0][1] = h[1] - ROut[0][0] * proj;
  ROut[1][1] = h[4] - ROut[1][0] * proj;
  ROut[2][1] = -h[7] - ROut[2][0] * proj;

  // Normalize R[:,1]
  double col2Norm = sqrt( ROut[0][1] * ROut[0][1] + ROut[1][1] * ROut[1][1] 
                          + ROut[2][1] * ROut[2][1] );

  ROut[0][1] /= col2Norm;
  ROut[1][1] /= col2Norm;
  ROut[2][1] /= col2Norm;

  // Compute R[:,2] by taking the cross product of R[:,0] and R[:,1]
  ROut[0][2] = ROut[1][0] * ROut[2][1] - ROut[2][0] * ROut[1][1];
  ROut[1][2] = ROut[2][0] * ROut[0][1] - ROut[0][0] * ROut[2][1];
  ROut[2][2] = ROut[0][0] * ROut[1][1] - ROut[1][0] * ROut[0][1];

  // Compute s 
  double s = 2.0 / ( sqrt( h[0]*h[0] + h[3]*h[3] + h[6]*h[6] ) 
                      + sqrt( h[1]*h[1] + h[4]*h[4] + h[7]*h[7] ) );

  pos3DOut[0] = s * h[2];
  pos3DOut[1] = s * h[5];
  pos3DOut[2] = -s;
}



/**
 * TODO: see header file for documentation
 */
Quaternion getQuaternionFromRotationMatrix(double R[3][3]) {

  Quaternion q;
  q.q[0] = sqrt(1 + R[0][0] + R[1][1] + R[2][2]) / 2.0;
  q.q[1] = (R[2][1] - R[1][2]) / (4 * q.q[0]);
  q.q[2] = (R[0][2] - R[2][0]) / (4 * q.q[0]);
  q.q[3] = (R[1][0] - R[0][1]) / (4 * q.q[0]);

  return q;

}
