function [U,V,A,B,stats,warning_code,err_code] = ...
    CCA_sc_pc(X,Y,sig_dig,scale_flag,pos_control)
% function [U,V,A,B,stats,warning_code,err_code] = ...
%     CCA_with_scaling(X,Y,sig_dig,scale_flag,pos_control)
% Performs Canonical Correlation Analysis (CCA).
%
% INPUTS: X -- N-by-P1 data matrix of inputs, where N is the number of
%              observations, and P1 is the number of input variables.
%         Y -- N-by-P2 data matrix of outputs, where N is the same as for
%              X and P2 is the number of output variables.
%         sig_dig -- number of significant digits to use in computation
%         scale_flag -- 1 to scale data to unit variance, 0 to leave
%                       data unscaled.
%         pos_control -- index of output (Y) to that will be forced
%                        to have a positive correlation.  Index is
%                        zero for no positive control, otherwise >0.
%
% OUTPUTS: U -- N-by-P3 matrix of canonical input components, where
%               each column is a canonical input component, and
%               P3 = min{P1,P2}.
%          V -- N-by-P3 matrix of canonical output components, where
%               each column is a canonical output component.
%          A -- P1-by-P3 matrix of input structure correlations, where
%               each column is the structure correlation of the P1 input
%               variables with a canonical input component.
%          B -- P2-by-P3 matrix of structure correlations, where each
%               column is the structure correlation of the P2 output
%               variables with a canonical output component.
%          stats -- 2-by-P3 matrix of statistics, where the first row
%                   is correlation R between the canonical components
%                   and the second row is Wilks' lambda likelihood ratio
%                   statistic.
%          warning_code -- an integer value indicates warnings conditions
%                   as follows:
%                   0 == result OK (no warnings)
%                   1 == X is not full rank
%                   2 == Y is not full rank
%                   3 == both X and Y are not full rank
%          err_code -- an integer value indicates error according
%                      to the following:
%                      0 == result OK
%                      1 == less than two arguments input
%                      2 == X and Y must have the same number of rows
%                      3 == X and Y must have more than one row
%                      4 == X must contain at least one non-constant column
%                      5 == Y must contain at least one non-constant column
%
% USAGE:
% Suppose we have 420 observations (e.g. simulations) with 10 input
% variables (e.g. Dakota inputs) and 7 output variables (e.g. tabulate
% metrics not including PLOAS).  Now X is 420-by-10 and Y is 420-by-7.
% The output matrices U and V are 420-by-7; A is 10-by-7; B is 7-by-7
% and stats is 7-by-2.  To make a correlation plot for the first
% canonical components, we would plot the first column of U versus the
% first column of V.  To make a Helio plot for the first canonical
% components, we would plot use the first column of A (input side)
% and the first column of B (output side).  The correlation for the
% first canonical component would be given by the first row and column
% of stats, and the Wilks statistic for the significance of the first
% canonical component would be given by the second row and first column
% of stats.  For the second canonical components, we would use the second
% columns of U,V,A,B, and stats.
%
% NOTES:
% 1. In the event of an error (not enough data, wrong size input
%    etc.), all returned matrices are empty.
% 2. This code was modified from the canoncorr.m file in the Matlab
%    statistics toolbox.
%
% S. Martin
% 6/30/2009

%   ORIGINAL MATLAB DOCUMENTATION
%   -----------------------------
%
%   [A,B] = CANONCORR(X,Y) computes the sample canonical coefficients for
%   the N-by-P1 and N-by-P2 data matrices X and Y.  X and Y must have the
%   same number of observations (rows) but can have different numbers of
%   variables (cols).  A and B are P1-by-D and P2-by-D matrices, where D =
%   min(rank(X),rank(Y)).  The jth columns of A and B contain the canonical
%   coefficients, i.e. the linear combination of variables making up the
%   jth canonical variable for X and Y, respectively.  Columns of A and B
%   are scaled to make COV(U) and COV(V) (see below) the identity matrix.
%   If X or Y are less than full rank, CANONCORR gives a warning and
%   returns zeros in the rows of A or B corresponding to dependent columns
%   of X or Y.
%
%   [A,B,R] = CANONCORR(X,Y) returns the 1-by-D vector R containing the
%   sample canonical correlations.  The jth element of R is the correlation
%   between the jth columns of U and V (see below).
%
%   [A,B,R,U,V] = CANONCORR(X,Y) returns the canonical variables, also
%   known as scores, in the N-by-D matrices U and V.  U and V are computed
%   as
%
%      U = (X - repmat(mean(X),N,1))*A and
%      V = (Y - repmat(mean(Y),N,1))*B.
%
%   [A,B,R,U,V,STATS] = CANONCORR(X,Y) returns a structure containing
%   information relating to the sequence of D null hypotheses H0_K, that
%   the (K+1)st through Dth correlations are all zero, for K = 0:(D-1).
%   STATS contains eight fields, each a 1-by-D vector with elements
%   corresponding to values of K:
%
%      Wilks:    Wilks' lambda (likelihood ratio) statistic
%      chisq:    Bartlett's approximate chi-squared statistic for H0_K,
%                with Lawley's modification
%      pChisq:   the right-tail significance level for CHISQ
%      F:        Rao's approximate F statistic for H0_K
%      pF:       the right-tail significance level for F
%      df1:      the degrees of freedom for the chi-squared statistic,
%                also the numerator degrees of freedom for the F statistic
%      df2:      the denominator degrees of freedom for the F statistic
%
%   Example:
%
%      load carbig;
%      X = [Displacement Horsepower Weight Acceleration MPG];
%      nans = sum(isnan(X),2) > 0;
%      [A B r U V] = canoncorr(X(~nans,1:3), X(~nans,4:5));
%
%      plot(U(:,1),V(:,1),'.');
%      xlabel('0.0025*Disp + 0.020*HP - 0.000025*Wgt');
%      ylabel('-0.17*Accel + -0.092*MPG')
%
%   See also PRINCOMP, MANOVA1.

%   References:
%     [1] Krzanowski, W.J., Principles of Multivariate Analysis,
%         Oxford University Press, Oxford, 1988.
%     [2] Seber, G.A.F., Multivariate Observations, Wiley, New York, 1984.

%   Copyright 1993-2004 The MathWorks, Inc.
%   $Revision: 1.4.4.3 $  $Date: 2004/01/16 20:09:04 $

% error checking -- default to empty matrices
% -------------------------------------------

U = [];
V = [];
A = [];
B = [];
stats = [];
err_code = 0;
warning_code = 0;

if nargin < 2
    err_code = 1;
    return;
    %error('stats:canoncorr:TooFewInputs','Requires two arguments.');
end

% default sig_dig to machine precision
if nargin < 3
    sig_dig = abs(log10(eps));
end

% default to perform scaling
if nargin < 4
    scale_flag = 1;
end

% default to no positive control
if nargin < 5
    pos_control = 0;
end

% check sig_dig input, adjust to machine precision if necessary
if sig_dig > abs(log10(eps))
    sig_dig = abs(log10(eps));
end

[n,p1] = size(X);
if size(Y,1) ~= n
    err_code = 2;
    return;
    %error('stats:canoncorr:InputSizeMismatch',...
    %      'X and Y must have the same number of rows.');
elseif n == 1
    err_code = 3;
    return;
    %error('stats:canoncorr:NotEnoughData',...
    %      'X and Y must have more than one row.');
end
p2 = size(Y,2);

% Center the variables
X = X - repmat(mean(X,1), n, 1);
Y = Y - repmat(mean(Y,1), n, 1);

% scale to unit variance, if requested
if scale_flag
    X = X./repmat(std(X), n, 1);
    Y = Y./repmat(std(Y), n, 1);
end

% Factor the inputs, and find a full rank set of columns if necessary
[Q1,T11,perm1] = qr(X,0);
rankX = sum(abs(diag(T11)) > 10^(log10(abs(T11(1)))-sig_dig)*max(n,p1));
                             % eps(abs(T11(1)))*max(n,p1));
if rankX == 0
    err_code = 4;
    return;
    %error('stats:canoncorr:BadData',...
    %      'X must contain at least one non-constant column');
elseif rankX < p1
    warning_code = 1;
    %warning('stats:canoncorr:NotFullRank','X is not full rank.');
    Q1 = Q1(:,1:rankX); T11 = T11(1:rankX,1:rankX);
end
[Q2,T22,perm2] = qr(Y,0);
rankY = sum(abs(diag(T22)) > 10^(log10(abs(T22(1)))-sig_dig)*max(n,p2));
                             % eps(abs(T22(1)))*max(n,p2));
if rankY == 0
    err_code = 5;
    return;
    %error('stats:canoncorr:BadData',...
    %      'Y must contain at least one non-constant column');
elseif rankY < p2
    if rankX < p1
        warning_code = 3;
    else
        warning_code = 2;
    end
    %warning('stats:canoncorr:NotFullRank','Y is not full rank.');
    Q2 = Q2(:,1:rankY); T22 = T22(1:rankY,1:rankY);
end

% done with error checking

% CCA
% ---

% Compute canonical coefficients and canonical correlations.  For rankX >
% rankY, the economy-size version ignores the extra columns in L and rows
% in D. For rankX < rankY, need to ignore extra columns in M and D
% explicitly. Normalize A and B to give U and V unit variance.
d = min(rankX,rankY);
[L,D,M] = svd(Q1' * Q2,0);
A = T11 \ L(:,1:d) * sqrt(n-1);
B = T22 \ M(:,1:d) * sqrt(n-1);

r = min(max(diag(D(:,1:d))', 0), 1); % remove roundoff errs

% Put coefficients back to their full size and their correct order
A(perm1,:) = [A; zeros(p1-rankX,d)];
B(perm2,:) = [B; zeros(p2-rankY,d)];

% Compute the canonical variates
U = X * A;
V = Y * B;

% compute structure correlations
% ------------------------------
A = Pearson ( U, X );
B = Pearson ( V, Y );

% adjust correlations according to positive control
if pos_control
    for i = 1:size(B,2)  % number of canonical components
        if B(pos_control,i) < 0
            A(:,i) = -A(:,i);   % flip the sign for this component
            B(:,i) = -B(:,i);
            U(:,i) = -U(:,i);   % flip the sign for the CCA scores
            V(:,i) = -V(:,i);
        end
    end
end

        
% compute Wilks' lambda statistic
% -------------------------------

k = 0:(d-1);
d1k = (rankX-k);
d2k = (rankY-k);
nondegen = find(r < 1);
logLambda = repmat(-Inf, 1, d);
logLambda(nondegen) = fliplr(cumsum(fliplr(log(1-r(nondegen).^2))));
Wilks = exp(logLambda);

stats = [r;Wilks];

return;

% original Matlab statistics (unused)
% -----------------------------------

% Compute test statistics for H0k: rho_(k+1) == ... = rho_d == 0
if nargout > 5
    % Wilks' lambda statistic
    k = 0:(d-1);
    d1k = (rankX-k);
    d2k = (rankY-k);
    nondegen = find(r < 1);
    logLambda = repmat(-Inf, 1, d);
    logLambda(nondegen) = fliplr(cumsum(fliplr(log(1-r(nondegen).^2))));
    stats.Wilks = exp(logLambda);
    
    % The exponent for Rao's approximation to an F dist'n.  When one (or both) of d1k
    % and d2k is 1 or 2, the dist'n is exactly F.
    s = ones(1,d); % default value for cases where the exponent formula fails
    okCases = find(d1k.*d2k > 2); % cases where (d1k,d2k) not one of (1,2), (2,1), or (2,2)
    snumer = d1k.*d1k.*d2k.*d2k - 4;
    sdenom = d1k.*d1k + d2k.*d2k - 5;
    s(okCases) = sqrt(snumer(okCases) ./ sdenom(okCases));
    
    % The degrees of freedom for H0k
    stats.df1 = d1k .* d2k;
    stats.df2 = (n - .5*(rankX+rankY+3)).*s - .5*d1k.*d2k + 1;
    
    % Rao's F statistic
    powLambda = stats.Wilks.^(1./s);
    ratio = repmat(Inf, 1, d);
    ratio(nondegen) = (1 - powLambda(nondegen)) ./ powLambda(nondegen);
    stats.F = ratio .* stats.df2 ./ stats.df1;
    stats.pF = fcdf(1 ./ stats.F, stats.df2, stats.df1); % == 1 - fcdf(F, df1, df2);

    % Lawley's modification to Bartlett's chi-squared statistic
    stats.chisq = -(n - k - .5*(rankX+rankY+3) + cumsum([0 1./r(1:(d-1))].^2)) .* logLambda;
    stats.pChisq = 1 - chi2cdf(stats.chisq, stats.df1);

    % Legacy fields - these are deprecated
    stats.dfe = stats.df1;
    stats.p = stats.pChisq;
end

% subroutine for computing structure correlations
% -----------------------------------------------

function A = Pearson ( U, X )
% function Pearson ( U, X )
% Compute Pearon's correlation for CCA.
%
% INPUTS: U -- N-by-P1 canonical components
%         X -- N-by-P2 data matrix
%
% OUTPUT: A -- P2-by-P1 matrix of correlations using Pearson's method
%
% S. Martin
% 6/30/2009

N = size(U,1);
P1 = size(U,2);
P2 = size(X,2);

for i = 1:P2
    for j = 1:P1
        
        % Pearson's sample correlation
        A(i,j) = (U(:,j) - mean(U(:,j)))'*(X(:,i) - mean(X(:,i)))/...
            ((N-1)*std(U(:,j))*std(X(:,i)));
        
    end
end
