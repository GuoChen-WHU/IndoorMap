<?php
require_once 'vendor\autoload.php';

use Fhaculty\Graph\Graph;
use Fhaculty\Graph\Vertex;
use Graphp\Algorithms\ShortestPath\Dijkstra;
use Fhaculty\Graph\Edge\Directed;

//�Ƚ���ǰ�˴�������ֹ������
$x1 = $_POST['x1'];
$y1 = $_POST['y1'];
$x2 = $_POST['x2'];
$y2 = $_POST['y2'];

//���������ݿ�qg_navpts������
$db = new mysqli('localhost', 'root', '', 'qg_navpts');

if (mysqli_connect_error())
{
	echo 'Error: Could not connect to database. Please try again later.';
	exit;
}

//��ѯ�õ����е����㣬��ӵ�ͼ����
//�����洢�Ĺ����У�˳�����õ�����ֹ������ĵ�����
$query = "select * from floor1_pts";
$allPoints = $db->query($query);

$graph = new Graph();

$pointNum = $allPoints->num_rows;
$minDistanceStartPointID = 0;//���������ĵ�����ID
$minDistanceEndPointID = 0;
$minDistanceStart = 65535;//���������ĵ���������ľ���
$minDistanceEnd = 65535;
for ($i = 0; $i < $pointNum; $i++)
{
	$pointData = $allPoints->fetch_assoc();
	$pointID = $pointData['pointNum'];
	$newVertex = $graph->createVertex($pointID);

	$x = $pointData['x'];
	$newVertex->setAttribute('x', $x);
	$y = $pointData['y'];
	$newVertex->setAttribute('y', $y);
	
	$distanceStart = ($x1 - $x) * ($x1 - $x) + ($y1 - $y) * ($y1 - $y);//��ǰ�������ľ���
	$distanceEnd = ($x2 - $x) * ($x2 - $x) + ($y2 - $y) * ($y2 - $y);
	if ($distanceStart < $minDistanceStart)
	{
		$minDistanceStart = $distanceStart;
		$minDistanceStartPointID = $pointID;
	}
	if ($distanceEnd < $minDistanceEnd)
	{
		$minDistanceEnd = $distanceEnd;
		$minDistanceEndPointID = $pointID;
	}
}
$allPoints->free();
//echo $minDistanceStartPointID." ".$minDistanceEndPointID." ".$minDistanceStart." ".$minDistanceEnd."<br/>";

//��ѯ�õ����е���������ڹ�ϵ�����ɱߴ洢��ͼ����
$query = "select * from floor1_adjpts";
$allEdges = $db->query($query);

$edgeNum = $allEdges->num_rows;
for ($i = 0; $i < $edgeNum; $i++)
{
	$edgeData = $allEdges->fetch_assoc();
	
	$firstPointId = $edgeData['pointNum1'];
	$secondPointId = $edgeData['pointNum2'];
	$edge1 = new Directed($graph->getVertex($firstPointId), $graph->getVertex($secondPointId));//��������������ıߣ�������һ������ߣ�����Ϊ�Ȿ������⣨��ʱ��֧������ͼ�����·���㷨=_=�� 
	$edge2 = new Directed($graph->getVertex($secondPointId), $graph->getVertex($firstPointId));
	
	$distance = (float)$edgeData['distance'];
	$edge1->setWeight($distance);
	$edge2->setWeight($distance);
	
//	echo $firstPointId." ".$secondPointId." ".$distance."<br/>";
}
$allEdges->free();
$db->close();
/*
$testVertices = $graph->getVertices();
foreach ($testVertices as $vertex)
{
	echo "<p>Point id=\"".$vertex->getId()."\" x=\"".$vertex->getAttribute('x')."\" y=\"".$vertex->getAttribute('y')."\"</p>";
}

$testEdges = $graph->getEdges();
foreach ($testEdges as $testEdge)
{
	$ver = $testEdge->getVertices();
	$firstNum = $ver->getVertexFirst()->getId();
	$secondNum = $ver->getVertexLast()->getId();
	echo "<p>Edge firstNum=".$firstNum." secondNum=".$secondNum." weight=".$testEdge->getWeight()."</p>";
}
*/


//Ѱ���� ����ʼ������ĵ����� �� ���յ�����ĵ����� �����·��
$startPoint = $graph->getVertex($minDistanceStartPointID);
$endPoint = $graph->getVertex($minDistanceEndPointID);

$alg = new Dijkstra($startPoint);
/*$testEdges = $alg->getEdgesTo($endPoint);
$k = 0;
foreach ($testEdges as $testEdge)
{
	$k++;
	$ver = $testEdge->getVertices();
	$firstNum = $ver->getVertexFirst()->getId();
	$secondNum = $ver->getVertexLast()->getId();
	echo "<p>Edge id=$k firstNum=".$firstNum." secondNum=".$secondNum." weight=".$testEdge->getWeight()."</p>";
}
*/
$walk = $alg->getWalkTo($endPoint);

$vertices = $walk->getVertices();

//�������������ǰ̨
ob_clean();
header('Content-type:text/xml');
echo "<?xml version=\"1.0\"?>
		<Navigation_Points>
			<Point id=\"startPoint\" x=\"$x1\" y=\"$y1\"></Point>";
foreach ($vertices as $vertex)
{
	echo "<Point id=\"".$vertex->getId()."\" x=\"".$vertex->getAttribute('x')."\" y=\"".$vertex->getAttribute('y')."\"></Point>";
}
echo "<Point id=\"endPoint\" x=\"$x2\" y=\"$y2\"></Point>
	  </Navigation_Points>";

?>